public class Prescription {
    private int id;
    private String medicineName;
    private String dosage;
    private String timing;
    private String mealInstruction;
    private String status;

    public Prescription(int id, String medicineName, String dosage,
            String timing, String mealInstruction,
            String status) {
        this.id = id;
        this.medicineName = medicineName;
        this.dosage = dosage;
        this.timing = timing;
        this.mealInstruction = mealInstruction;
        this.status = status;
    }

    public int getId() {
        return id;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public String getDosage() {
        return dosage;
    }

    public String getTiming() {
        return timing;
    }

    public String getMealInstruction() {
        return mealInstruction;
    }

    public String getStatus() {
        return status;
    }
}