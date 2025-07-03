# Global Train - Dynamic Training Management System

## Overview

Global Train is a sophisticated desktop application built with **Electron and React**, designed to be the definitive solution for managing complex training programs. It provides a powerful, role-based system for administrators, trainers, and candidates to handle the entire training lifecycle—from course creation and event scheduling to generating dynamic, data-driven PDF documents.

The core philosophy of this application is **flexibility through a database-driven UI**. Instead of hard-coding forms and checklists, Global Train uses a relational SQLite database to define every aspect of a document, allowing for rapid development and easy updates without ever touching the core application code.

---

## Technology Stack

### Core Technologies
- **Frontend**: React 19.1.0 with Vite 6.3.5 as the build tool
- **Desktop Framework**: Electron 36.5.0
- **Database**: SQLite 3 5.1.7
- **Styling**: Tailwind CSS 3.4.17

### Key Dependencies
- **PDF Generation**: Puppeteer 24.10.2, pdf-lib 1.17.1
- **Digital Signatures**: react-signature-canvas 1.1.0-alpha.2
- **Utilities**: Lodash 4.17.21, uuid 11.1.0
- **Development**: Vite, PostCSS, Autoprefixer

---

## Key Features

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

### **Physical Document Validation**
A unique system that bridges the gap between digital tracking and physical paperwork.
- **Live File Counting**: Forms can be configured to monitor specific folders on the file system. The UI displays a live status of how many files are present versus how many are expected.
- **Two Folder Structures Supported**:
    1.  **Event-Wide**: Checks a central folder for the event (e.g., `.../Non Mandatory Files/PhoneticQuiz/`).
    2.  **Candidate-Specific**: Checks a subfolder within a specific candidate's directory (e.g., `.../06 Candidate/01 John Doe/PracticalAssessment/`).
- **Conditional PDF Generation**: The "Generate PDF" button is disabled until the physical file requirements are met, ensuring a complete audit trail.
- **Persistent Progress**: The completion status is saved to the database, so it persists across application restarts and user sessions.

### **Candidate-Centric Document Management (`CandidateScreen.jsx`)**
The `CandidateScreen` provides a focused interface for managing all documentation and details related to a single trainee within a specific event. It's a key view for trainers who need to track individual progress.

- **Three-Panel Layout**: The screen is divided into three distinct, interactive panels for an efficient workflow:
    1.  **Event Candidates (Left)**: A list of all trainees enrolled in the currently active training event. Selecting a candidate updates the other two panels.
    2.  **Required Documents (Middle)**: Displays a list of all documents required for the selected candidate, filtered by their course and the trainer's role. Each document shows a real-time completion percentage (`✔` for 100%, `?` for untouched, or a percentage).
    3.  **Form Canvas (Right)**: The main work area where the selected document's form is rendered for completion. If no document is selected, it shows the candidate's key details (Sponsor, Sentry Number, etc.).

- **Dynamic Form Rendering**: Based on the document selected, this view dynamically loads and renders the appropriate React form component (e.g., `PreCourseForm`, `PhoneticQuizForm`, `PracticalAssessmentForm`). This is driven by the `documents` table in the database.

- **Real-time Progress Updates**: The screen listens for progress updates from across the application. If another user is working on a document for the selected candidate, the progress indicator will update automatically without needing a manual refresh.

- **Integrated PDF Generation**: Trainers can generate a PDF of any completed or in-progress form directly from this screen. The system renders the form component to HTML, applies the application's styles, and uses Electron's backend services to create and save a PDF file.

- **Specialized Document Handling**: Includes logic to conditionally display certain forms, such as the `LeavingForm`, which only appears when a trainer toggles a specific checkbox, keeping the UI clean and context-aware.

### **Database-Driven Document Generation**
- The structure of all forms and checklists is defined in the database, not in the code.
- Supports a wide variety of input types including standard inputs, interactive elements (tri-toggles, signatures), and complex data grids.

### **Comprehensive Document Types**
The application now supports **13 different document types**, each with a specific scope and purpose.

| #  | Name                                     | Type              | Scope       | Description                                                 |
|----|------------------------------------------|-------------------|-------------|-------------------------------------------------------------|
| 1  | Register                                 | Questionnaire     | Course      | Attendance, competency tracking, and final results.         |
| 2  | Training Course Checklist                | Questionnaire     | Course      | Pre-course and learner pack verification.                   |
| 3  | Training & Welding Track Safety Briefing | Questionnaire     | Course      | Practical safety training and sign-off.                     |
| 4  | Pre Course                               | Questionnaire     | Candidate   | Equality, diversity, and self-assessment info.              |
| 5  | Post Course                              | *Placeholder*     | Candidate   | Future use for post-training documentation.                 |
| 6  | Leaving Form                             | Questionnaire     | Candidate   | Documentation for candidates who leave a course early.      |
| 7  | Phonetic Quiz                            | **File-Based**    | Candidate   | Validates scanned copies of the phonetic quiz assessment.   |
| 8  | Emergency Phone Call Exercise            | **File-Based**    | Candidate   | Validates scanned copies of the emergency call exercise.    |
| 9  | Progress Record                          | Questionnaire     | Course      | Tracks overall course progress via a dynamic questionnaire. |
| 10 | Deviation Form                           | *Placeholder*     | Course      | Future use for documenting deviations from the standard.    |
| 11 | Practical Assessment                     | **File-Based**    | Candidate   | Validates the scanned practical assessment for one trainee. |
| 12 | Recert Emergency Call Practical          | **File-Based**    | Candidate   | Validates the scanned recertification assessment.           |
| 13 | Track Walk Delivery Requirements         | **File-Based**    | Candidate   | Validates scanned copies of track walk safety checks.       |

### **Advanced Form Features**
- **Real-time Progress Tracking**: Completion percentages are calculated and displayed instantly.
- **Persistent State**: All form data and completion statuses are saved to the database, persisting across sessions.
- **Conditional UI**: Forms adapt based on user input (e.g., Leaving Form only appears when needed).
- **Digital Signatures**: Integrated signature capture with a modal interface.

---

## System Architecture

### Database Schema

The application's flexibility comes from its comprehensive SQLite database (`database.db`). The schema supports dynamic form generation and complex training workflows.

| Table                    | Description                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                  | Stores user credentials and roles (`dev`, `admin`, `trainer`, `candidate`).                                                             |
| `courses`                | Defines available training courses with linked document IDs, competencies, course length, and non-mandatory folder specifications.     |
| `trainees`               | Manages information for all training participants including sponsor details and additional comments.                                     |
| `datapack`               | Core table representing completed training events. Links courses, trainers, and trainees.                                              |
| `incomplete_registers`   | Stores draft training event registrations with auto-save and timestamp tracking.                                                        |
| `documents`              | Lists all document types with scope definitions and role-based visibility controls.                                                     |
| `questionnaires`         | **The heart of the dynamic UI.** Defines sections, questions, input types, and access controls for every document.                      |
| `questionnaire_options`  | Stores dropdown options and multiple-choice answers for questionnaire fields.                                                           |
| `responses`              | Stores all submitted form data with trainee associations and completion tracking.                                                       |
| `competencies`           | Professional competencies that can be assessed and tracked.                                                                             |
| `document_progress`      | **NEW**: Persists the completion percentage of documents for each trainee, ensuring state is saved across sessions.                        |
| `permissions`            | Role-based permission system for fine-grained access control.                                                                           |

### Project Structure

```
global-train/
├── database.db              # SQLite database file
├── init-db.js               # Database initialization and seeding script
├── index.html               # Application entry point
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite build configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── public/
│   └── GlobalTrainLogo.jpg  # Application logo
└── src/
    ├── main.js              # Electron main process
    ├── preload.js           # Electron preload script (IPC bridge)
    └── renderer/            # React application source
        ├── App.jsx          # Main React application component
        ├── index.css        # Global styles and Tailwind imports
        ├── context/
        │   └── EventContext.jsx # Global state management for active events
        └── components/
            ├── LoginScreen.jsx      # Authentication interface
            ├── Dashboard.jsx        # Main application dashboard with tabs
            ├── CreationScreen.jsx   # Training event creation and management
            ├── CourseScreen.jsx     # Course-level document management
            ├── CandidateScreen.jsx  # Candidate-level document management
            ├── UsersScreen.jsx      # User management (admin only)
            ├── common/              # Shared UI components
            │   ├── QuestionnaireForm.jsx # Dynamic form generator
            │   ├── SignatureModal.jsx    # Digital signature capture
            │   ├── TriToggleButton.jsx   # Three-state toggle component
            │   ├── Dropdown.jsx          # Dropdown component
            │   └── DeveloperTools.jsx    # Debug tools for developers
            ├── General/             # General training documents
            │   ├── Register/
            │   ├── PreCourse/
            │   ├── PostCourse/
            │   ├── LeavingForm/
            │   └── TrainingCourseChecklist/
            └── PTS/                 # PTS-specific documents
                ├── PhoneticQuiz/
                ├── EmergencyPhoneCallExercise/
                ├── PracticalAssessment/
                ├── RecertEmergencyCallPracticalAssessment/
                └── TrainingAndWeldingTrackSafetyBreifing/
```

---

## Getting Started

### Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)
- **Windows 10/11** (primary target, though cross-platform support via Electron)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd global-train
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database:**
   This script creates `database.db` and seeds it with initial data, including sample users, courses, and training events.
   ```bash
   npm run db:init
   ```

4. **Run the application in development mode:**
   ```bash
   npm run dev
   ```
   This starts both the Vite development server and the Electron application.

### Default Login Credentials

After database initialization, you can log in with these test accounts:

**Developer Account:**
- Username: `aditya` | Password: `chaubey`

**Admin Account:**
- Username: `mick` | Password: `lamont`

**Trainer Accounts:**
- Username: `george` | Password: `penman`
- Username: `stewart` | Password: `roxburgh`

**Candidate Account:**
- Username: `johndoe` | Password: `doe`

### Building for Production

- **Development Build:**
  ```bash
  npm run build
  ```

- **Package Application:**
  ```bash
  npm run package
  ```
  Creates a packaged app for your current platform without an installer.

- **Create Installer:**
  ```bash
  npm run make
  ```
  Creates a native installer for your current platform.

### Development Workflow

- **Vite Development Server**: Runs on `http://localhost:5173`
- **Hot Reload**: Automatic refresh during development
- **Database Reset**: Run `npm run db:init` to reset database to initial state
- **Debugging**: Developer tools available in dev mode (F12)

---

## Document Management System

### Document Scopes

**Course Documents** apply to the entire training event:
- Visible to all participants
- Completed once per course
- Examples: Register, Training Course Checklist

**Candidate Documents** are specific to individual trainees:
- Personalized for each participant
- Completed individually
- Examples: Pre-course Assessment, Leaving Form

### Form Input Types

The system supports a rich variety of input types:
- `text`, `number`, `date`, `time` - Standard form inputs
- `textarea` - Multi-line text areas
- `checkbox` - Boolean checkboxes
- `dropdown` - Select dropdowns with database-driven options
- `tri_toggle` - Three-state toggle (Yes/No/N/A)
- `signature_box` - Digital signature capture
- `signature_grid` - Signature collection for multiple trainees
- `trainee_dropdown_grid` - Dropdown grids for trainee-specific data
- `trainee_date_grid` - Date grids for trainee-specific dates
- `time_capture_button` - One-click time capture buttons

### Competency Tracking

- Dynamic competency assessment based on course requirements
- Visual progress indicators for each competency
- Automated competency grid generation
- Support for multiple competency types (PTS, DCCR, COSS, OLP, PC)

---

## Contributing

This application is designed for easy extension:

1. **Adding New Document Types**: Create new entries in the `documents` table
2. **Custom Form Fields**: Add new input types to the `QuestionnaireForm` component
3. **New Courses**: Add courses through the database with associated documents
4. **Role Management**: Extend the permission system for new user types

The database-driven architecture means most changes can be made through data rather than code modifications.

---

## Support

For technical support or feature requests, please refer to the development team or system administrator. The application includes built-in developer tools for troubleshooting and system diagnostics. 