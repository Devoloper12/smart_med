# Smart Medicine Assistant - MongoDB Multi-User Version

## Overview
The application has been successfully migrated from **MySQL** to **MongoDB** (supporting both local MongoDB and MongoDB Atlas).

## What Changed
- **Database Engine**: Fully transitioned from MySQL JDBC to official MongoDB Java Driver (`mongo-java-driver-3.12.14.jar` in `lib/`).
- **Collections Architecture**:
  - `users`: stores patient account credentials (PBKDF2 hashes), allergies, caregiver contact, and profile metadata.
  - `prescriptions`: stores each patient's medicine schedules, dosages, timings, meal instructions, and status (`PENDING`, `TAKEN`, `MISSED`).
  - `sos_logs`: emergency event records linked to patients.
  - `allergy_alert_logs`: audit trail of potential allergy conflicts detected when adding prescriptions.
  - `counters`: atomic sequence counters for thread-safe sequential `user_id` and prescription `id`.
- **Database Configuration**:
  - Configurable via `mongodb.properties` (or environment variable `MONGODB_URI`).
  - Defaults to `mongodb://localhost:27017` with database `smart_medicine_db`.
  - Supports MongoDB Atlas connection strings out of the box (`mongodb+srv://...`).

## Configuration (`mongodb.properties`)
```properties
# For Local MongoDB:
mongodb.uri=mongodb://localhost:27017

# For MongoDB Atlas (uncomment and replace credentials):
# mongodb.uri=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority

mongodb.database=smart_medicine_db
```

## How to Run
1. Open the `smart_med` folder in **VS Code**.
2. Ensure MongoDB is running locally (`mongodb://localhost:27017`) or specify your MongoDB Atlas URI in `mongodb.properties` or the `MONGODB_URI` environment variable.
3. Open [`src/Main.java`](file:///C:/Users/HIMASANKAR/.gemini/antigravity/scratch/smart_med/src/Main.java) and click **Run** (or press `F5` / use VS Code Java Runner).

## First Use
1. Launch the application and click **Create an account**.
2. Enter username, password, patient name, allergies (comma-separated), and caregiver contact.
3. Click **Create Account**. Your account and default collections will be created automatically in MongoDB.
4. Add prescriptions and test the **Allergy Guard**, **Mark as TAKEN / MISSED**, **Master-Slave Sync**, and **Emergency SOS** features.
