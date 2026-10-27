public interface CaregiverObserver {

    void onEmergencyTriggered(String message);

    void onMissedDoseAlert(String medicineName);
}
