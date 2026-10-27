public class User {
    private final int userId;
    private final String username;
    private final String name;
    private final String allergies;
    private final String caregiverContact;

    public User(int userId, String username, String name, String allergies, String caregiverContact) {
        this.userId = userId;
        this.username = username;
        this.name = name;
        this.allergies = allergies == null ? "" : allergies;
        this.caregiverContact = caregiverContact == null ? "" : caregiverContact;
    }

    public int getUserId() { return userId; }
    public String getUsername() { return username; }
    public String getName() { return name; }
    public String getAllergies() { return allergies; }
    public String getCaregiverContact() { return caregiverContact; }
}
