import com.mongodb.MongoClientSettings;
import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.ReturnDocument;
import org.bson.Document;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;
import java.util.concurrent.TimeUnit;

public class DatabaseSetup {
    private static final String DEFAULT_URI = "mongodb://localhost:27017";
    private static final String DEFAULT_DB_NAME = "smart_medicine_db";

    private static MongoClient mongoClient = null;
    private static MongoDatabase mongoDatabase = null;
    private static String configuredUri = DEFAULT_URI;
    private static String configuredDbName = DEFAULT_DB_NAME;

    static {
        loadConfiguration();
    }

    private static void loadConfiguration() {
        // 1. Try mongodb.properties file
        File propFile = new File("mongodb.properties");
        if (!propFile.exists()) {
            propFile = new File("smart_med/mongodb.properties");
        }

        if (propFile.exists()) {
            try (InputStream input = new FileInputStream(propFile)) {
                Properties prop = new Properties();
                prop.load(input);
                configuredUri = prop.getProperty("mongodb.uri", DEFAULT_URI).trim();
                configuredDbName = prop.getProperty("mongodb.database", DEFAULT_DB_NAME).trim();
            } catch (Exception e) {
                System.err.println("Could not read mongodb.properties, using defaults: " + e.getMessage());
            }
        }

        // 2. Override with Environment variable if set (useful for MongoDB Atlas)
        String envUri = System.getenv("MONGODB_URI");
        if (envUri != null && !envUri.isBlank()) {
            configuredUri = envUri.trim();
        }

        // 3. Override with System property if set (-Dmongodb.uri=...)
        String sysUri = System.getProperty("mongodb.uri");
        if (sysUri != null && !sysUri.isBlank()) {
            configuredUri = sysUri.trim();
        }
    }

    public static synchronized MongoDatabase getDatabase() {
        if (mongoDatabase == null) {
            initializeDatabase();
        }
        return mongoDatabase;
    }

    public static synchronized MongoClient getClient() {
        if (mongoClient == null) {
            initializeDatabase();
        }
        return mongoClient;
    }

    public static void initializeDatabase() {
        try {
            System.out.println("Connecting to MongoDB at: " + maskUri(configuredUri));

            MongoClientSettings settings = MongoClientSettings.builder()
                    .applyConnectionString(new ConnectionString(configuredUri))
                    .applyToSocketSettings(builder -> builder.connectTimeout(5000, TimeUnit.MILLISECONDS))
                    .applyToClusterSettings(builder -> builder.serverSelectionTimeout(5000, TimeUnit.MILLISECONDS))
                    .build();

            mongoClient = MongoClients.create(settings);
            mongoDatabase = mongoClient.getDatabase(configuredDbName);

            // Test connection by listing collection names or pinging
            mongoDatabase.runCommand(new Document("ping", 1));

            // Ensure collections and unique indexes exist
            MongoCollection<Document> usersCol = mongoDatabase.getCollection("users");
            usersCol.createIndex(Indexes.ascending("username"), new IndexOptions().unique(true));
            usersCol.createIndex(Indexes.ascending("user_id"), new IndexOptions().unique(true));

            MongoCollection<Document> rxCol = mongoDatabase.getCollection("prescriptions");
            rxCol.createIndex(Indexes.ascending("user_id"));
            rxCol.createIndex(Indexes.ascending("id"), new IndexOptions().unique(true));

            MongoCollection<Document> sosCol = mongoDatabase.getCollection("sos_logs");
            sosCol.createIndex(Indexes.ascending("user_id"));

            MongoCollection<Document> allergyCol = mongoDatabase.getCollection("allergy_alert_logs");
            allergyCol.createIndex(Indexes.ascending("user_id"));

            System.out.println("Database setup successfully completed for MongoDB database: " + configuredDbName);
        } catch (Exception e) {
            System.err.println("MongoDB Connection Warning: Could not connect to MongoDB server (" + e.getMessage() + ")");
            System.err.println("Please ensure MongoDB is running locally on port 27017 or configure mongodb.properties with your MongoDB Atlas URI.");
        }
    }

    /**
     * Atomically generates a thread-safe incrementing integer ID
     */
    public static synchronized int getNextSequence(String sequenceName) {
        try {
            MongoCollection<Document> counters = getDatabase().getCollection("counters");
            Document update = new Document("$inc", new Document("seq", 1));
            FindOneAndUpdateOptions options = new FindOneAndUpdateOptions().upsert(true).returnDocument(ReturnDocument.AFTER);
            Document result = counters.findOneAndUpdate(Filters.eq("_id", sequenceName), update, options);
            if (result != null && result.containsKey("seq")) {
                Object seqObj = result.get("seq");
                if (seqObj instanceof Number) {
                    return ((Number) seqObj).intValue();
                }
            }
        } catch (Exception e) {
            System.err.println("Error generating sequence for " + sequenceName + ": " + e.getMessage());
        }
        // Fallback to timestamp if counter fails
        return (int) (System.currentTimeMillis() % 1000000000L);
    }

    private static String maskUri(String uri) {
        return uri.replaceAll("://[^:]+:[^@]+@", "://***:***@");
    }

    public static String getConfiguredUri() {
        return configuredUri;
    }

    public static String getConfiguredDbName() {
        return configuredDbName;
    }
}
