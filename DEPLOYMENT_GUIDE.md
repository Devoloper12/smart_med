# Deployment Guide: Vercel (Frontend) & Render (Backend)

This project has been cleanly separated into two distinct directories:
- **`backend/`**: Node.js + Express + MongoDB Atlas REST API (Ready for **Render**)
- **`frontend/`**: HTML5 + CSS3 + Vanilla JavaScript + Bootstrap 5 (Ready for **Vercel**)

---

## Part 1: Deploy Backend on Render

### Step 1: Push Project to GitHub
Initialize your Git repository if not already done:
```bash
git add .
git commit -m "Separate backend and frontend for Render and Vercel"
git push origin main
```

### Step 2: Create a Web Service on Render
1. Go to [render.com](https://render.com) and log in.
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `smart-medicine-backend`
   - **Root Directory**: `backend` *(Crucial!)*
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Step 3: Add Environment Variables on Render
Under the **Environment** tab on Render, add:
- `NODE_ENV`: `production`
- `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/smart_medicine_db?retryWrites=true&w=majority`
- `JWT_SECRET`: `your_random_secure_jwt_secret_key_here`
- `JWT_EXPIRES_IN`: `7d`
- `CLIENT_URL`: `*` *(or your Vercel URL once generated)*

### Step 4: Deploy & Copy Backend URL
Click **Create Web Service**. Once deployed, Render will provide a live URL such as:
`https://smart-medicine-backend.onrender.com`

Verify it is running by opening:
`https://smart-medicine-backend.onrender.com/api/health`

---

## Part 2: Deploy Frontend on Vercel

### Step 1: Import Project into Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** > **Project**.
3. Import your GitHub repository.

### Step 2: Configure Project Settings
In the Vercel project configuration window:
- **Root Directory**: Click `Edit` and select **`frontend`** *(Crucial!)*
- **Framework Preset**: `Other` (Static HTML)
- **Build Command**: Leave empty / default
- **Output Directory**: Leave empty / default

### Step 3: Set Backend URL in Frontend
There are two easy ways:

#### Option A: In Code (Recommended)
Before pushing, open `frontend/js/config.js` and set your Render URL:
```javascript
const CONFIG = {
  DEFAULT_RENDER_API: 'https://smart-medicine-backend.onrender.com/api',
  ...
};
```

#### Option B: Live via UI
1. Once your Vercel site is deployed, click on the **API Config** pill in the navigation bar.
2. Paste your Render backend URL (e.g. `https://smart-medicine-backend.onrender.com/api`).
3. Click **Save & Connect**. The frontend will automatically route all API requests to your live Render backend!

---

## Local Development (Running Both Together)

### 1. Start Backend:
```bash
cd backend
npm install
npm run dev
# Backend runs at http://localhost:5000
```

### 2. Run Frontend:
You can serve the frontend with any static server or VS Code Live Server:
```bash
cd frontend
npx serve .
# Frontend runs at http://localhost:3000
```
When running locally on `localhost`, the frontend automatically points to `http://localhost:5000/api`.
