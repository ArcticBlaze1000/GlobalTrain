# Global Train - Dynamic Training Management System

## Overview

Global Train is a sophisticated desktop application built with **Electron and React**, designed to be the definitive solution for managing complex training programs. It provides a powerful, role-based system for administrators and trainers to handle the entire training lifecycle—from course creation and event scheduling to generating dynamic, data-driven PDF documents.

The core philosophy of this application is **flexibility through a database-driven UI**. Instead of hard-coding forms and checklists, Global Train uses a relational SQLite database to define every aspect of a document, allowing for rapid development and easy updates without ever touching the core application code.

---

## Key Features

-   **Role-Based Access Control (RBAC)**: A secure login system that tailors the user experience to the logged-in user's role.
    -   **Admin/Dev**: Full access to all screens, including user management and system configuration.
    -   **Trainer**: A focused view for managing their assigned training events and completing the necessary documentation.

-   **Dynamic Event & Datapack Management**:
    -   Create and manage **Courses** (e.g., PTS, COSS Initial).
    -   Assign trainees and a trainer to a specific course instance, creating a **Datapack** that represents a unique training event.

-   **Database-Driven Document Generation**:
    -   The structure of all forms and checklists is defined in the database, not in the code. This allows for easy creation or modification of questionnaires on the fly.
    -   Supports a wide variety of input types, from simple checkboxes and dropdowns to complex grids and digital signatures.

-   **Scoped Documentation**:
    -   Documents can be scoped to either a **Course** or a **Candidate**.
    -   `Course` documents apply to the entire training event (e.g., Attendance Register).
    -   `Candidate` documents are specific to an individual trainee (e.g., Pre-Course Assessment, Leaving Form), allowing for personalized tracking.

-   **Conditional UI & Smart Forms**:
    -   The user interface intelligently adapts to user input. For example, the "Leaving Form" only becomes available if a trainer marks a candidate as "Leaving," keeping the UI clean and context-aware.

-   **Persistent & Real-Time Progress Tracking**:
    -   The completion percentage for each course document is calculated and displayed in real-time.
    -   This progress state persists across navigation, giving trainers an at-a-glance overview of what's outstanding.

-   **Automated PDF Generation**:
    -   Generate professional, pixel-perfect PDF documents from completed forms with the click of a button.
    -   Uses a powerful template-based system to ensure all generated documents are consistent and accurate.

-   **Non-Blocking UI Feedback**:
    -   User feedback, such as login errors, is displayed through non-blocking inline messages, creating a smooth and seamless user experience without disruptive pop-ups.

---

## System Architecture

### Database Schema

The application's flexibility comes from its relational SQLite database (`database.db`). The schema is the blueprint for the entire application's functionality.

| Table                 | Description                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `users`               | Stores user credentials and roles (`dev`, `admin`, `trainer`).                                                                           |
| `courses`             | Defines available training courses and links them to their required document IDs.                                                        |
| `trainees`            | Manages information for all individuals participating in training.                                                                       |
| `datapack`            | The core table representing a training event. It links a `course`, a `trainer`, and a set of `trainees`.                                 |
| `documents`           | Lists all document types. The `scope` column ('course' or 'candidate') is critical for determining a document's context.                 |
| `questionnaires`      | **The heart of the dynamic UI.** Defines the sections, questions, and input types for every document.                                    |
| `questionnaire_options` | Stores the available options for any dropdown-style questions in the `questionnaires` table.                                           |
| `responses`           | Stores all submitted data. The `trainee_ids` column specifies which trainee(s) a response belongs to, enabling candidate-scoped tracking. |
| `competencies`        | A list of professional competencies that can be assessed.                                                                                |

### Project Structure

```
global-train/
|-- database.db         # SQLite database file
|-- init-db.js          # Node.js script to initialize the DB schema and seed data
|-- src/
|   |-- main.js         # Electron main process
|   |-- preload.js      # Electron preload script
|   |-- renderer/       # React application source
|   |   |-- components/ # React components for screens, forms, and UI elements
|   |   |-- context/    # React context providers for global state (e.g., active event)
|   |   |-- App.jsx     # Main React app component
|   |   `-- index.css   # Main stylesheet for Tailwind CSS
|-- package.json        # Project metadata and dependencies
`-- README.md           # This file
```

---

## Getting Started

### Prerequisites

-   Node.js
-   npm

### Installation & Running

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd global-train
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Initialize the database:**
    This script creates `database.db` and seeds it with initial data. Run this anytime you need to reset the database.
    ```sh
    npm run db:init
    ```

4.  **Run the application in development mode:**
    ```sh
    npm run dev
    ```

### Building the Application

-   `npm run package`: Packages the app for your current platform without creating an installer.
-   `npm run make`: Creates a native installer for your current platform. 