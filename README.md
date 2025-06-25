# Global Train - Training Management System

## Project Overview

Global Train is a desktop application built with Electron and React, designed to streamline the management of training courses, trainees, and associated documentation. It provides a role-based system for administrators, trainers, and developers to manage the entire training lifecycle, from course creation to generating completion documents. A key feature of the application is its ability to create dynamic questionnaires and checklists for various training documents, and then generate PDFs from the completed forms.

## Tech Stack

- **Framework:** Electron, React
- **Bundler:** Vite
- **Database:** SQLite
- **Styling:** Tailwind CSS
- **PDF Generation:** pdf-lib, Puppeteer

## Features

- **User Authentication:** Secure login system with role-based access control.
- **Role-Based Views:** The interface adapts based on user roles (Admin, Trainer, Dev), showing relevant screens and actions.
- **Course Management:** Create and manage training courses.
- **Trainee Management:** Add and manage trainee information.
- **Datapack Creation:** Group trainees, courses, and trainers into "datapacks" representing a specific training event.
- **Dynamic Questionnaires:** The system uses a database-driven approach to generate forms and checklists for different training documents.
- **PDF Generation:** Generate PDF documents from completed questionnaires and forms.
- **User Management:** Admins can manage user accounts.

## Database Schema

The application uses an SQLite database (`database.db`) to persist data. The schema is initialized by `init-db.js`.

- **`users`**: Stores user credentials and roles (`dev`, `admin`, `trainer`).
- **`trainees`**: Manages information about individuals participating in training.
- **`courses`**: Defines the available training courses.
- **`documents`**: Lists the types of documents that can be generated (e.g., Register, Checklist).
- **`questionnaires`**: Holds the structure for dynamic forms (questions, sections, input types) associated with each document.
- **`questionnaire_options`**: Stores options for dropdowns in the questionnaires.
- **`datapack`**: Represents a specific training instance, linking a course, trainer, and trainees.
- **`responses`**: Saves the answers submitted for each questionnaire within a datapack.

## Project Structure

```
global-train/
|-- database.db         # SQLite database file
|-- init-db.js          # Node.js script to initialize the DB schema and seed data
|-- src/
|   |-- main.js         # Electron main process
|   |-- preload.js      # Electron preload script
|   |-- renderer/       # React application source
|   |   |-- components/ # React components
|   |   |-- context/    # React context providers
|   |   |-- App.jsx     # Main React app component
|   |   `-- index.css   # Main stylesheet
|-- package.json        # Project metadata and dependencies
`-- README.md           # This file
```

## Component Breakdown

The core of the application is built around a few key React components.

### Main Components
- **`App.jsx`**: The root component. It handles the login state and renders either the `LoginScreen` or the `Dashboard`.
- **`LoginScreen.jsx`**: Provides the user interface for authentication.
- **`Dashboard.jsx`**: The main container after login. It features a tab-based navigation that displays different screens based on the user's role.

### Screens
The `Dashboard` renders one of the following screens based on the active tab:

- **`CreationScreen.jsx`**: (Admin/Dev only) Likely used for creating new courses, users, or datapacks.
- **`CourseScreen.jsx`**: Displays information about courses and datapacks. This is the main view for trainers.
- **`CandidateScreen.jsx`**: Displays and manages trainee information.
- **`UsersScreen.jsx`**: (Admin/Dev only) Used for managing application users.

### Form and PDF Generation
- **`Register/`**, **`TrainingAndWeldingTrackSafetyBreifing/`**, **`TrainingCourseChecklist/`**: These folders contain components related to specific documents.
    - **`Form.jsx`**: Renders the dynamic questionnaire for that document type.
    - **`PDFGenerator.jsx`**: Contains the logic to generate a PDF from the form data.
    - **`Template.jsx`**: A template for the PDF structure.

### Common Components
- **`common/`**: Contains reusable components like `Dropdown.jsx`, a generic `PDFGenerator.jsx`, and `QuestionnaireForm.jsx`.

## Getting Started

### Prerequisites

- Node.js
- npm

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
    This script will create `database.db` if it doesn't exist and seed it with initial data.
    ```sh
    npm run db:init
    ```

4.  **Run the application in development mode:**
    This will start the Vite dev server for the React app and launch the Electron application.
    ```sh
    npm run dev
    ```

### Building the Application

To package the application for distribution, you can use the following scripts:

-   `npm run package`: Packages the app without creating an installer.
-   `npm run make`: Creates an installer for your platform. 