import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.model.Updates;
import org.bson.Document;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Controller {

    private MongoDatabase getDatabase() {
        return DatabaseSetup.getDatabase();
    }

    private MongoCollection<Document> getUsersCollection() {
        return getDatabase().getCollection("users");
    }

    private MongoCollection<Document> getPrescriptionsCollection() {
        return getDatabase().getCollection("prescriptions");
    }

    private MongoCollection<Document> getAllergyLogsCollection() {
        return getDatabase().getCollection("allergy_alert_logs");
    }

    private MongoCollection<Document> getSosLogsCollection() {
        return getDatabase().getCollection("sos_logs");
    }

    public User registerUser(String username, char[] password, String name,
                             String allergies, String caregiverContact) throws DuplicateUsernameException, Exception {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username cannot be empty");
        }

        MongoCollection<Document> users = getUsersCollection();

        // Check if username already exists
        Document existing = users.find(Filters.eq("username", username.trim())).first();
        if (existing != null) {
            throw new DuplicateUsernameException("That username already exists. Choose another username.");
        }

        int nextUserId = DatabaseSetup.getNextSequence("user_id");
        String passwordHash = PasswordUtil.hashPassword(password);

        Document userDoc = new Document("user_id", nextUserId)
                .append("username", username.trim())
                .append("password_hash", passwordHash)
                .append("name", name.trim())
                .append("allergies", allergies == null ? "" : allergies.trim())
                .append("caregiver_contact", caregiverContact == null ? "" : caregiverContact.trim())
                .append("created_at", new Date());

        users.insertOne(userDoc);

        return new User(nextUserId, username.trim(), name.trim(),
                allergies == null ? "" : allergies.trim(),
                caregiverContact == null ? "" : caregiverContact.trim());
    }

    public User login(String username, char[] password) {
        if (username == null) return null;
        try {
            MongoCollection<Document> users = getUsersCollection();
            Document doc = users.find(Filters.eq("username", username.trim())).first();
            if (doc != null && PasswordUtil.verifyPassword(password, doc.getString("password_hash"))) {
                return userFromDocument(doc);
            }
        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
        }
        return null;
    }

    public User getUser(int userId) {
        try {
            MongoCollection<Document> users = getUsersCollection();
            Document doc = users.find(Filters.eq("user_id", userId)).first();
            if (doc != null) {
                return userFromDocument(doc);
            }
        } catch (Exception e) {
            System.err.println("getUser error: " + e.getMessage());
        }
        return null;
    }

    public boolean updateProfile(int userId, String name, String allergies, String caregiverContact) {
        try {
            MongoCollection<Document> users = getUsersCollection();
            users.updateOne(
                    Filters.eq("user_id", userId),
                    Updates.combine(
                            Updates.set("name", name.trim()),
                            Updates.set("allergies", allergies == null ? "" : allergies.trim()),
                            Updates.set("caregiver_contact", caregiverContact == null ? "" : caregiverContact.trim()),
                            Updates.set("updated_at", new Date())
                    )
            );
            return true;
        } catch (Exception e) {
            System.err.println("updateProfile error: " + e.getMessage());
            return false;
        }
    }

    private User userFromDocument(Document doc) {
        int userId = getIntSafe(doc, "user_id", 0);
        String username = getStringSafe(doc, "username", "");
        String name = getStringSafe(doc, "name", "");
        String allergies = getStringSafe(doc, "allergies", "");
        String caregiverContact = getStringSafe(doc, "caregiver_contact", "");

        return new User(userId, username, name, allergies, caregiverContact);
    }

    // Prototype check: exact stored allergy names/phrases are compared with the entered medicine name.
    public String findMatchingAllergy(int userId, String medicineName) {
        User user = getUser(userId);
        if (user == null || user.getAllergies().isBlank()) return null;
        String medicine = medicineName.trim().toLowerCase();
        for (String allergy : user.getAllergies().split("[,;\\n]")) {
            String a = allergy.trim().toLowerCase();
            if (!a.isEmpty() && (medicine.contains(a) || a.contains(medicine))) {
                return allergy.trim();
            }
        }
        return null;
    }

    public boolean addPrescription(int userId, String name, String dosage, String timing, String meal) {
        try {
            MongoCollection<Document> prescriptions = getPrescriptionsCollection();
            int nextId = DatabaseSetup.getNextSequence("prescription_id");

            Document rxDoc = new Document("id", nextId)
                    .append("user_id", userId)
                    .append("medicine_name", name.trim())
                    .append("dosage", dosage.trim())
                    .append("timing", timing.trim())
                    .append("meal_instruction", meal.trim())
                    .append("status", "PENDING")
                    .append("created_at", new Date());

            prescriptions.insertOne(rxDoc);
            return true;
        } catch (Exception e) {
            System.err.println("addPrescription error: " + e.getMessage());
            return false;
        }
    }

    public List<Prescription> getAllPrescriptions(int userId) {
        List<Prescription> list = new ArrayList<>();
        try {
            MongoCollection<Document> prescriptions = getPrescriptionsCollection();
            for (Document doc : prescriptions.find(Filters.eq("user_id", userId)).sort(Sorts.descending("id"))) {
                int id = getIntSafe(doc, "id", 0);
                String medName = getStringSafe(doc, "medicine_name", "");
                String dosage = getStringSafe(doc, "dosage", "");
                String timing = getStringSafe(doc, "timing", "");
                String meal = getStringSafe(doc, "meal_instruction", "");
                String status = getStringSafe(doc, "status", "PENDING");

                list.add(new Prescription(id, medName, dosage, timing, meal, status));
            }
        } catch (Exception e) {
            System.err.println("getAllPrescriptions error: " + e.getMessage());
        }
        return list;
    }

    public void updatePrescriptionStatus(int userId, int id, String status) {
        try {
            MongoCollection<Document> prescriptions = getPrescriptionsCollection();
            prescriptions.updateOne(
                    Filters.and(Filters.eq("id", id), Filters.eq("user_id", userId)),
                    Updates.combine(
                            Updates.set("status", status),
                            Updates.set("status_updated_at", new Date())
                    )
            );
        } catch (Exception e) {
            System.err.println("updatePrescriptionStatus error: " + e.getMessage());
        }
    }

    public void logAllergyAlert(int userId, String medicine, String allergies, String evidence) {
        try {
            MongoCollection<Document> logs = getAllergyLogsCollection();
            Document logDoc = new Document("user_id", userId)
                    .append("medicine_name", medicine)
                    .append("matched_allergies", allergies)
                    .append("evidence", evidence)
                    .append("event_time", new Date());
            logs.insertOne(logDoc);
        } catch (Exception e) {
            System.err.println("logAllergyAlert error: " + e.getMessage());
        }
    }

    public void logEmergencyEvent(int userId, String message) {
        try {
            MongoCollection<Document> logs = getSosLogsCollection();
            Document logDoc = new Document("user_id", userId)
                    .append("alert_message", message)
                    .append("event_time", new Date());
            logs.insertOne(logDoc);
        } catch (Exception e) {
            System.err.println("logEmergencyEvent error: " + e.getMessage());
        }
    }

    private static int getIntSafe(Document doc, String field, int defaultValue) {
        Object val = doc.get(field);
        if (val instanceof Number) {
            return ((Number) val).intValue();
        }
        return defaultValue;
    }

    private static String getStringSafe(Document doc, String field, String defaultValue) {
        Object val = doc.get(field);
        return val != null ? val.toString() : defaultValue;
    }
}
