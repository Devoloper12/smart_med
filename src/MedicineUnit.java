import java.util.List;

public abstract class MedicineUnit {

    protected String unitId;

    public MedicineUnit(String unitId) {
        this.unitId = unitId;
    }

    public abstract void syncSchedule(List<Prescription> prescriptions);
}