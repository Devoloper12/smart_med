import java.util.List;

public class SlaveUnit extends MedicineUnit {

    public SlaveUnit(String unitId) {
        super(unitId);
    }

    @Override
    public void syncSchedule(List<Prescription> prescriptions) {
        System.out.println(
                "[Slave Unit " + unitId + "] Synchronized "
                        + prescriptions.size()
                        + " medication schedules.");
    }
}