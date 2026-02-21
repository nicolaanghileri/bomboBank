# 🏦 bomboBank

## What it is
**bomboBank** is a modern web application designed to import Swiss e-banking CSV exports and transform them into a sleek, personal finance cockpit. It bridges the gap between raw bank data and actionable insights by combining seamless CSV ingestion, automated transaction categorization, and intuitive dashboard views for day-to-day expense tracking.

## Who it’s for
**Primary Persona:** Individual banking users who regularly export Swiss bank CSV statements and want a clean, automated, and private view of their personal spending habits without relying on bloated, third-party budget apps.

---

## What it does

### 🔐 Authentication & Security
* **User Management:** Fully integrated with Supabase Auth for secure sign-up, sign-in, and sign-out functionality.
* **Secure Uploads:** Uploads bank CSV files securely from the UI to a FastAPI endpoint utilizing Bearer token (JWT) authentication.

### ⚙️ Data Processing & Ingestion
* **Smart Parsing:** Parses messy, multi-line CSV rows characteristic of Swiss banks, normalizes fields, and automatically assigns categories using a robust Regex mapping engine.
* **Duplicate Prevention:** Ensures data integrity by checking a unique hash of `iban` + `booked_at` + `amount` before inserting records.
* **Resilient Batch Inserts:** Processes transactions in batches, featuring row-level retries and comprehensive error collection to handle partial failures gracefully.

### 📊 Dashboard & Insights
* **Core Metrics:** Instantly view essential metrics like *Total Out* (spending), daily *Burn Rate*, *Unassigned* transaction counts, and a detailed *Category Breakdown*.
* **Interactive History:** Provides a highly searchable and category-filtered transaction history directly in the frontend.

---

## How it works (Repo-based Architecture)

* **Frontend:** Built with **React + Vite**, utilizing the Supabase JS client for seamless client-side authentication and session handling.
* **API:** Powered by a **FastAPI** backend, featuring a dedicated endpoint (`/api/upload/bank-csv`) built specifically for robust CSV ingestion.
* **Data Flow:** 1. Browser uploads the CSV file along with the user's JWT.
    2. API intercepts and decodes the JWT `sub` (User ID).
    3. The Python parser cleans, transforms, and categorizes the rows.
    4. The backend performs a secure, authenticated insert directly into Supabase.
* **Storage & Configuration:** * Relies on Supabase tables (`transactions` and `categories`). 
    * Category Regex rules are easily maintainable and stored locally in `backend/mapping.json`.
* **Note:** A standard PostgreSQL connection test runs in `backend/main.py` at startup to ensure database health (this runs independently of the main Supabase Auth flow).