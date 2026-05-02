# MediAI - Precision Healthcare Portal

MediAI is a state-of-the-art medical platform designed for patients, doctors, and administrators. It provides role-based access to clinical insights, patient records, and doctor-matching services with integrated map coordinates.

## 🚀 Core Features

### 1. Unified Authentication System
- **Role-Based Access**: Specialized dashboards for Patients, Doctors, and Admins.
- **Admin Stealth Login**: Secured via environment variables. If `NEXT_PUBLIC_IS_ADMIN_ENABLED` is true, admin credentials grant access to the root management panel.
- **OTP & Google Auth**: Multiple secure entry points using Supabase Auth.

### 2. Clinical Profile (Patient & Doctor)
- **Patient Side**: Tracks medical history, allergies, blood type, and emergency contacts.
- **Doctor Side**: Allows medical practitioners to manage their professional clinic data, including specialization, consultation fees, and GPS coordinates for patient matching.
- **Data Integrity**: All clinical data is encrypted and stored in Supabase with HIPAA-compliant standards in mind.

### 3. Smart Doctor Matching & Geospatial Intelligence
- **Precision Geolocation**: Detects user location with high-precision (100m) centering and smooth `flyTo` animations.
- **Interactive Google Maps**: Visualizes clinics with **Red Pins** and the user with a **Blue Pin** for instant visual differentiation.
- **Recommendation Engine**: Automatically sorts the doctor list to show the **Nearest Specialist** at the top with a dynamic **"Recommended"** badge.
- **Metric Distance (KM)**: Real-time distance calculation in Kilometers (KM) for local relevance.

### 4. Administrative Control
- **Resilient Database Provisioning**: Admins can provision doctors with full clinical metadata (Specialty, Fee, Rating, Availability). The system includes a fallback mechanism to ensure data integrity even if the database schema is being updated.
- **User Auditing**: Secure oversight of registered personnel and system roles via the Service Role interface.

### 5. Advanced Doctor Portal
- **Clinical Dashboard**: Real-time stats on patient activity and upcoming consultations.
- **Self-Service Management**: Doctors can update their own clinical profile, availability, and consultation fees directly from their dashboard to maintain accurate patient expectations.

---

## 📂 Project Architecture

### Pages & Functions

| Page Path | Functionality | Data Logic |
|-----------|---------------|------------|
| `/login` | Authentication Entry | Checks `.env` for admin flags; uses Supabase for user auth. |
| `/dashboard` | Patient Home | Fetches personalized health summaries and upcoming appointments. |
| `/doctor/dashboard` | Practitioner Panel | Manages patient queue, clinical stats, and consultation schedule. |
| `/admin/dashboard` | Global Management | Restricted UI for database entry and user auditing. |
| `/profile` | Clinical Data Mgmt | Role-aware form. Saves patient medical history or doctor clinic data. |
| `/doctors` | Specialist Directory | Fetches all clinics from Supabase and sorts them by proximity. |

### Component Breakdown

- **`Navigation.js`**: Adaptive sidebar that changes links based on user role. Hidden on restricted/auth pages.
- **`DoctorsMap.js`**: Encapsulates Google Maps integration for clinical precision.
- **`MapPicker.js`**: Administrative tool to precisely point clinic locations on a map.

---

## 🛠️ Technical Setup

### Environment Variables (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project API URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public access key for DB.
- `NEXT_PUBLIC_ADMIN_USERNAME`: Admin email for management access.
- `NEXT_PUBLIC_ADMIN_PASSWORD`: Secure password for the admin panel.
- `NEXT_PUBLIC_IS_ADMIN_ENABLED`: Boolean flag to toggle admin login logic.
- `NEXT_PUBLIC_GOOGLE_MAPS_KEY`: API key for interactive mapping.

### Data Flow
1. **User Auth**: Handled by Supabase Auth (Email/Password, OTP, OAuth).
2. **Profile Data**: Saved in the `profiles` table (linked by `user_id`).
3. **Clinical Directory**: Doctors are saved in the `doctors` table. Accessible via `/api/doctor`.
4. **Proximity Search**: Calculated on-the-fly in `/doctors/page.js` using the current user's GPS coordinates.

---

## 🔒 Security Policy
- **Route Protection**: Middleware and client-side checks prevent unauthorized access to `/admin/dashboard` and `/doctor/dashboard` routes.
- **Environment Isolation**: Admin credentials are never stored in the database; they are handled via server-side and environment-level checks for maximum security.
