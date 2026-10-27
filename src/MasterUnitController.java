import java.util.ArrayList;
import java.util.List;

public class MasterUnitController extends MedicineUnit {

    private List<SlaveUnit> slaveUnits = new ArrayList<>();
    private List<CaregiverObserver> observers = new ArrayList<>();

    public MasterUnitController(String unitId) {
        super(unitId);
    }

    public void addSlaveUnit(SlaveUnit slave) {
        slaveUnits.add(slave);
    }

    public void registerObserver(CaregiverObserver observer) {
        observers.add(observer);
    }

    @Override
    public void syncSchedule(List<Prescription> prescriptions) {

        System.out.println(
                "[Master Unit " + unitId +
                        "] Broadcasting schedule to connected Slave units...");

        for (SlaveUnit slave : slaveUnits) {
            slave.syncSchedule(prescriptions);
        }
    }

    public void notifyEmergency(String sosMessage) {
        for (CaregiverObserver observer : observers) {
            observer.onEmergencyTriggered(sosMessage);
        }
    }

    public void notifyMissedDose(String medicineName) {
        for (CaregiverObserver observer : observers) {
            observer.onMissedDoseAlert(medicineName);
        }
    }
}