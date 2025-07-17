# Global Train - Dynamic Training Management System

## Overview

Global Train is a sophisticated desktop application built with **Electron and React**, designed to be the definitive solution for managing complex training programs. It provides a powerful, role-based system for administrators, trainers, and candidates to handle the entire training lifecycle—from course creation and event scheduling to generating dynamic, data-driven PDF documents.

The core philosophy of this application is **flexibility through a database-driven UI**. Instead of hard-coding forms and checklists, Global Train uses a relational SQLite database to define every aspect of a document, allowing for rapid development and easy updates without ever touching the core application code.

---

## Technology Stack

### Core Technologies
- **Frontend**: React 19.1.0
- **Build Tool**: Vite 6.3.5
- **Desktop Framework**: Electron 36.5.0
- **Database**: SQLite3 5.1.7, with `tedious` for SQL Server connections
- **Styling**: Tailwind CSS 3.4.17
- **Cloud Storage**: Azure Blob Storage 12.27.0

### Key Dependencies
- **PDF Generation**: `pdf-lib` 1.17.1, `puppeteer` 24.10.2
- **Digital Signatures**: `react-signature-canvas` 1.1.0-alpha.2
- **File Management**: `react-dropzone` 14.3.8
- **Utilities**: `lodash` 4.17.21, `uuid` 11.1.0

---

## Key Features

### **Advanced Course Configuration**
The application now features a powerful, modal-based interface for course management, allowing administrators to dynamically define every aspect of a training program. This system provides granular control over course structure, ensuring that training events are tailored, consistent, and easy to manage.

- **Create and Edit Courses**: Admins can add new courses or modify existing ones through an intuitive modal.
- **Set Course Details**: Define the course name and duration (in days).
- **Assign Documents & Competencies**: Link specific documents and competencies to each course from a master list.
- **Non-Mandatory Documents**: Mark certain documents as non-mandatory, allowing for flexible training requirements where some paperwork may be optional.

### **Enhanced Role-Based Access Control (RBAC)**
A comprehensive login system that tailors the user experience to the logged-in user's role:
- **Dev**: Full system access including developer tools and debugging features.
- **Admin**: Complete management access including user management and system configuration.
- **Trainer**: Focused view for managing assigned training events and completing documentation.
- **Candidate**: Self-service portal for completing pre-course assessments and viewing personal training data.

### **Dynamic Event & Datapack Management**
- Create and manage **Courses** (e.g., PTS, PTS Recert, COSS Initial).
- Assign trainees and a trainer to a specific course instance, creating a **Datapack** that represents a unique training event.
- **Draft Management**: Save incomplete training event registrations as drafts with auto-save functionality.
- **Automatic Folder Management**: On startup, the application synchronizes and creates structured folder systems for all past and present training events, ensuring consistency.

### **Candidate-Centric Document Management (`CandidateScreen.jsx`)**
The `CandidateScreen` provides a focused interface for managing all documentation and details related to a single trainee within a specific event. It's a key view for trainers who need to track individual progress.

- **Three-Panel Layout**: The screen is divided into three distinct, interactive panels for an efficient workflow:
    1.  **Event Candidates (Left)**: A list of all trainees enrolled in the currently active training event.
    2.  **Required Documents (Middle)**: Displays a list of all documents required for the selected candidate.
    3.  **Form Canvas (Right)**: The main work area where the selected document's form is rendered for completion.

### **Advanced Flagging System**
To enhance collaboration and issue resolution, the application includes a sophisticated flagging system. This allows any user to raise a "flag" on a specific page, document, or even a trainee, to draw an administrator's attention to a potential issue.

### **Database-Driven Document Generation**
- The structure of all forms and checklists is defined in the database, not in the code.
- Supports a wide variety of input types including standard inputs, interactive elements, and digital signatures.

### **Advanced Form Features**
- **Real-time Progress Tracking**: Completion percentages are calculated and displayed instantly.
- **Persistent State**: All form data and completion statuses are saved to the database, persisting across sessions.
- **Digital Signatures**: Integrated signature capture with a modal interface.

---

## System Architecture

### Database Schema
The application's flexibility comes from its comprehensive SQLite database (`database.db`).

| Table                    | Description                                                                 |
| ------------------------ | --------------------------------------------------------------------------- |
| `users`                  | Stores user credentials and roles (`dev`, `admin`, `trainer`, `candidate`). |
| `courses`                | Defines available training courses.                                         |
| `trainees`               | Manages information for all training participants.                          |
| `datapack`               | Represents a unique training event, linking courses, trainers, and trainees.|
| `incomplete_registers`   | Stores draft training event registrations.                                  |
| `documents`              | Lists all document types with their configurations.                         |
| `questionnaires`         | Defines the structure of each dynamic form.                                 |
| `questionnaire_options`  | Stores dropdown options for questionnaire fields.                           |
| `responses`              | Stores all submitted form data.                                             |
| `document_progress`      | Persists the completion percentage of documents for each trainee.           |
| `flags`                  | Manages the flagging system for issue tracking.                             |

### Project Structure
```
global-train/
├── database.db
├── init-db.js
├── index.html
├── package.json
└── src/
    ├── main.js              # Electron Main Process
    ├── preload.js           # Electron Preload Script
    └── renderer/
        ├── App.jsx
        ├── index.css
        ├── context/
        │   └── EventContext.jsx
        └── components/
            ├── Admin/
            │   ├── CoursesManagement.jsx
            ├── Common/
            ├── General/
            ├── PTS/
            ├── AdminScreen.jsx
            ├── CandidateScreen.jsx
            ├── CourseScreen.jsx
            ├── CreationScreen.jsx
            ├── Dashboard.jsx
            ├── LoginScreen.jsx
            └── UsersScreen.jsx
```

---

## Getting Started

### Prerequisites
- **Node.js** (v16 or higher recommended)
- **npm**

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd global-train
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Initialize the database:**
    This script creates `database.db` and populates it with the necessary schema and initial data.
    ```bash
    npm run db:init
    ```

4.  **Run the application in development mode:**
    This command starts the Vite dev server and launches the Electron application.
    ```bash
    npm run dev
    ``` 