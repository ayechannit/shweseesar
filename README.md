# Shwe See Sar Clinic - Master Data Management

A Full-Stack Web Application for managing the master data of the clinic as per the clinic proposal requirements.

## Tech Stack
*   **Database:** PostgreSQL
*   **Backend:** Node.js, Express
*   **Frontend:** React, Vite, Vanilla CSS Design System

## Features Included
1.  **Dashboard Shell:** Sidebar navigation with smooth UX.
2.  **6 Core Modules:** Patients, Physicians, Medical Officers, Nurses, Suppliers, and Referred Persons.
3.  **Soft Deletion:** "Delete" hides the data using the `is_active` flag instead of fully wiping it out of the database.
4.  **Responsive Design:** Beautiful, card-based interface created from scratch.

## Setup Instructions

### 1. Database Configuration
1.  Create a PostgreSQL database named `shweseesar`.
2.  Update the connection credentials (if necessary) by creating a `.env` file in the `server` directory:
    \`\`\`env
    DB_USER=postgres
    DB_PASSWORD=postgres
    DB_NAME=shweseesar
    DB_HOST=localhost
    DB_PORT=5432
    PORT=5000
    \`\`\`
3.  Execute the provided initialization script (`server/init.sql`) against your database to create the required tables.

### 2. Running the Application
At the root of the project (`D:\AC\Shwe See Sar`), you can run both the frontend and backend simultaneously using:

\`\`\`bash
npm start
\`\`\`

*   **Frontend:** http://localhost:5173
*   **Backend API:** http://localhost:5000/api/master-data