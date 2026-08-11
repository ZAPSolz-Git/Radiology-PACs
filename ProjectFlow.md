# Armorray Radiology Platform - Development & Architecture Blueprint

**Objective:** This document serves as the primary technical specification and requirement blueprint for the development team. It outlines the system architecture, core modules, and data flows that the team needs to build for the Armorray Radiology Platform.

---

## 1. Project Overview
We are building a robust, web-based Radiology platform designed to ingest DICOM images directly from hospital modalities, route them intelligently, and provide a seamless diagnostic workflow for technicians, radiologists, and QA teams. The platform includes a zero-footprint diagnostic viewer, real-time collaboration tools, strict role-based access control, and financial billing snapshots.

---

## 2. High-Level Architecture Diagram
The following Mermaid diagram illustrates the target architecture the team needs to implement. It covers the interactions between the frontend SPA, the backend API services, and the custom PACS pipeline.

```mermaid
flowchart TB
    %% Styling
    classDef user fill:#e1bee7,stroke:#8e24aa,stroke-width:2px,color:#000;
    classDef frontend fill:#c8e6c9,stroke:#388e3c,stroke-width:2px,color:#000;
    classDef backend fill:#bbdefb,stroke:#1976d2,stroke-width:2px,color:#000;
    classDef pacs fill:#ffecb3,stroke:#ffa000,stroke-width:2px,color:#000;
    classDef db fill:#ffcdd2,stroke:#d32f2f,stroke-width:2px,color:#000;

    %% Subgraphs
    subgraph Users ["User Roles & Actors"]
        Admin(["👨‍💻 Administrator"])
        Tech(["🧑‍🔬 Technician"])
        QA(["🕵️ Quality Assurance (QA)"])
        Rad(["🧑‍⚕️ Radiologist"])
        Modality(["🏥 Modalities (CT/MRI/X-Ray)"])
    end

    subgraph Frontend ["Frontend UI (React / Vite SPA)"]
        direction TB
        AuthUI["Login & RBAC Authentication"]
        TechDash["Technician Dashboard<br/>(Case Upload, Workflow Tracking)"]
        QADash["QA Dashboard<br/>(Verify Images, Dispatch, Finalize Reports)"]
        RadDash["Radiologist Dashboard<br/>(Mobile-Responsive Worklist, Reporting)"]
        AdminDash["Admin Console<br/>(Viewer Roles, User Mgmt)"]
        OHIF["Integrated DICOM Viewer<br/>(OHIF/Cornerstone3D, MPR)"]
        ChatUI["Real-time CaseChatHub"]
    end

    subgraph API ["Backend API Services (Node.js / Express)"]
        direction TB
        AuthService["Auth Service (JWT)"]
        CaseService["Case Management & Reporting"]
        QAService["QA & Billing Service<br/>(Verification, Financial Lock)"]
        SocketHub["Socket.io Communication Hub<br/>(Real-time Progress & Notifications)"]
        PACSManager["PACS Integration Service"]
    end

    subgraph PACS ["Smart PACS Pipeline"]
        direction TB
        NodeSCP["Custom Node.js DICOM SCP<br/>(Smart Routing by AE Titles)"]
        OrthancServer["Orthanc DICOM Server<br/>(Storage, DICOMweb, QIDO/WADO)"]
    end

    subgraph Database ["Data Persistence"]
        MongoDB[("MongoDB Atlas<br/>(Users, Cases, Billing, Logs)")]
    end

    %% Interactions & Flows
    %% Users to Frontend
    Admin -->|Manages| AdminDash
    Tech -->|Uploads/Tracks| TechDash
    QA -->|Verifies/Audits| QADash
    Rad -->|Reads/Reports| RadDash

    Admin --> AuthUI
    Tech --> AuthUI
    QA --> AuthUI
    Rad --> AuthUI

    RadDash -.->|Opens| OHIF
    QADash -.->|Opens| OHIF
    TechDash -.->|Uses| ChatUI
    RadDash -.->|Uses| ChatUI
    QADash -.->|Uses| ChatUI

    %% Frontend to Backend
    AdminDash -->|REST| AuthService
    TechDash -->|REST| CaseService
    RadDash -->|REST| CaseService
    QADash -->|REST| QAService
    ChatUI <-->|WebSocket| SocketHub
    
    %% Viewer directly interacts with PACS for images
    OHIF <--> |"DICOMweb (WADO-RS / QIDO-RS)"| OrthancServer

    %% External Systems to Pipeline
    Modality -->|"C-STORE (Push Studies)"| NodeSCP

    %% Backend to Backend/PACS Logic
    NodeSCP -->|"Smart Routing & Forwarding"| OrthancServer
    NodeSCP -->|"Triggers Real-time Upload Events"| SocketHub
    PACSManager <-->|"API/DICOM Commands"| OrthancServer
    
    %% Backend to Database
    CaseService --> MongoDB
    AuthService --> MongoDB
    QAService --> MongoDB
    PACSManager --> MongoDB

    %% Applying styles
    class Admin,Tech,QA,Rad,Modality user;
    class AuthUI,TechDash,QADash,RadDash,AdminDash,OHIF,ChatUI frontend;
    class AuthService,CaseService,QAService,SocketHub,PACSManager backend;
    class NodeSCP,OrthancServer pacs;
    class MongoDB db;
```

---

## 3. Core Modules to Build

### 👥 1. Frontend: Role-Based Portals (React/Vite)
- **Administrator Console**: Build an interface to manage user roles, system configurations, and viewer role restrictions. 
- **Technician Dashboard**: Build a workflow tracker for technicians to upload cases, monitor ingestion status, and assign studies. Must include a fully mobile-responsive UI with a real-time `CaseChatHub`.
- **QA Dashboard**: Build a portal for the Quality Assurance team to verify patient/image data, assign (dispatch) studies to doctors, request corrections, and finalize the financial billing locks for completed reports.
- **Radiologist Dashboard**: Build a high-density, touch-optimized clinical worklist. Must allow radiologists to review their assigned cases, communicate with technicians/QA, draft final reports, and launch the DICOM viewer.

### 🖼️ 2. Integrated DICOM Viewer
- **Implementation**: Integrate the OHIF Viewer with Cornerstone3D within our React application.
- **Requirements**: Progressive loading, Multi-Planar Reconstruction (MPR), and Zero-Footprint deployment.
- **Security Requirement**: Implement role-based tool restrictions dynamically injected from the backend (e.g., locking advanced measurement tools for basic roles), including a fail-open safety mechanism to prevent configuration tampering.

### 📡 3. Smart PACS Workflow Management
- **Node.js DICOM SCP**: Build a custom DICOM receiver listener using Node.js that accepts `C-STORE` pushes directly from hospital modalities.
- **Intelligent Routing**: Write logic to route the incoming study to the appropriate technician/clinic based on the incoming **AE Title**.
- **Orthanc DICOM Server**: Deploy and connect an Orthanc server to act as our primary storage, serving images to the OHIF viewer using standard `DICOMweb` (WADO-RS / QIDO-RS) protocols.

### ⚡ 4. Real-Time Socket Communication
- **Socket.io Hub**: Implement a WebSocket layer to push live updates across the platform without page refreshes.
- **Requirements**: Real-time progress bars for heavy DICOM uploads (ingestion progress) and instant chat messaging (CaseChatHub) between Technicians, QA, and Radiologists.

### 🗄️ 5. Backend API & Data Persistence
- **Stack**: Build the core APIs using Node.js & Express.
- **Database**: Use MongoDB Atlas for schema-flexible storage of users, cases, reporting metadata, billing/tariffs snapshots, chat logs, and configuration matrices.

---

## 4. Detailed Implementation Workflows (HLD)

The team must implement the following exact workflows. These Sequence Diagrams break down the processes step-by-step.

### A. DICOM Ingestion & Smart Routing Flow
**Goal for the team:** Build the pipeline that automatically catches a DICOM push from a hospital, saves it to Orthanc, and updates the technician's UI in real-time.

```mermaid
sequenceDiagram
    autonumber
    participant Modality as Modality (CT/MRI)
    participant NodeSCP as Node.js DICOM SCP
    participant Orthanc as Orthanc Server
    participant DB as MongoDB
    participant Socket as Socket.io Hub
    participant Tech as Technician Dashboard

    Modality->>NodeSCP: C-STORE Request (Push DICOM images)
    activate NodeSCP
    NodeSCP->>NodeSCP: Extract AE Title & Metadata
    NodeSCP->>Orthanc: Forward DICOM instance to Orthanc
    Orthanc-->>NodeSCP: Store Success
    NodeSCP->>DB: Log Upload Progress / Create/Update Case
    NodeSCP->>Socket: Emit 'uploadProgress' Event
    Socket-->>Tech: Update Real-time Progress Bar
    NodeSCP-->>Modality: C-STORE Response (Success)
    deactivate NodeSCP
    Note over NodeSCP,Tech: Upon completion, the finalized Case appears in the Worklist (Pending QA)
```

### B. QA Verification & Dispatch Flow
**Goal for the team:** Build the pre-read workflow where a QA verifies the incoming study quality before assigning it to a radiologist.

```mermaid
sequenceDiagram
    autonumber
    participant QA as QA Reviewer
    participant QADash as QA Dashboard
    participant API as Backend API
    participant DB as MongoDB
    participant Socket as Socket.io Hub

    QA->>QADash: Access Pending QA Queue
    QADash->>API: GET /api/qa/queue
    API-->>QADash: Return Cases
    QA->>QADash: Verify identity, image quality, contrast
    QADash->>API: POST /api/qa/:id/verify
    API->>DB: Update QA Verification Checkpoints
    QA->>QADash: Dispatch/Assign Case to Radiologist
    QADash->>API: POST /api/qa/:id/dispatch (doctorId, priority)
    API->>DB: Update Assigned Doctor & Status ('Assigned')
    API->>Socket: Emit 'case_updated' Event
    API-->>QADash: Success
```

### C. Radiologist Diagnostic Flow
**Goal for the team:** Build the diagnostic flow. A radiologist clicks a case, the viewer loads the images securely, and they write their report (submitting it to QA Audit).

```mermaid
sequenceDiagram
    autonumber
    participant Rad as Radiologist
    participant Dash as Rad Dashboard
    participant API as Backend API
    participant OHIF as OHIF Viewer
    participant Orthanc as Orthanc Server
    participant DB as MongoDB

    Rad->>Dash: Login & View Worklist
    Dash->>API: GET /api/cases (assigned)
    API-->>Dash: Return Case List
    Rad->>Dash: Click "View Study"
    Dash->>OHIF: Launch Viewer (passes StudyInstanceUID)
    activate OHIF
    OHIF->>API: Verify Viewer Role Restrictions
    API-->>OHIF: Matrix of Allowed Tools (e.g., MPR, Length)
    OHIF->>Orthanc: DICOMweb (WADO-RS) Request Images
    Orthanc-->>OHIF: Stream Image Data
    Rad->>OHIF: Review Images & Annotate
    deactivate OHIF
    Rad->>Dash: Open Reporting Editor
    Rad->>Dash: Draft & Submit Report
    Dash->>API: POST /api/reports
    API->>DB: Save Report & Update Case Status ('QA_Audit')
    API-->>Dash: Success
```

### D. QA Finalization & Billing Snapshot Flow
**Goal for the team:** Build the final post-read workflow. QA checks the radiologist's report, finalizes it, and the system locks the financial price based on the active tariff.

```mermaid
sequenceDiagram
    autonumber
    participant QA as QA Reviewer
    participant QADash as QA Dashboard
    participant API as Backend API
    participant DB as MongoDB
    participant Socket as Socket.io Hub

    QA->>QADash: Review Submitted Report (QA_Audit)
    QA->>QADash: Finalize Report
    QADash->>API: POST /api/qa/:id/finalize
    API->>DB: Update Case Status ('Finalized')
    API->>API: Calculate Case Earning from active Tariff
    API->>DB: Snapshot Billing Info & Lock Price
    API->>Socket: Emit 'case_updated' Event
    API-->>QADash: Success (Report Locked)
```

### E. Real-Time Collaboration Flow (CaseChatHub)
**Goal for the team:** Implement a chat hub tied to specific clinical cases, enabling immediate communication.

```mermaid
sequenceDiagram
    autonumber
    participant Tech as Technician
    participant TechDash as Tech CaseChatHub
    participant Socket as Socket.io Server
    participant DB as MongoDB
    participant RadDash as Rad/QA CaseChatHub
    participant Rad as Radiologist / QA

    Tech->>TechDash: Type message regarding Case X
    TechDash->>Socket: Emit 'sendMessage' (CaseID, Payload)
    Socket->>DB: Persist chat message
    DB-->>Socket: Saved confirmation
    Socket->>RadDash: Broadcast 'receiveMessage' (to Case X room)
    RadDash-->>Rad: Display new message notification
    Rad->>RadDash: Reply to message
    RadDash->>Socket: Emit 'sendMessage'
    Socket->>DB: Persist chat message
    Socket->>TechDash: Broadcast 'receiveMessage'
    TechDash-->>Tech: Display reply
```

### F. Admin Access Control & Viewer Restrictions Flow
**Goal for the team:** Build the configuration interface and logic that controls which features are enabled in the OHIF viewer based on the user's role.

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Administrator
    participant AdminUI as Admin Console
    participant API as Backend API
    participant DB as MongoDB
    participant OHIF as OHIF Viewer

    Admin->>AdminUI: Configure Viewer Restrictions for Role
    AdminUI->>API: PUT /api/roles/config
    API->>DB: Update Role Restrictions Data
    API-->>AdminUI: Configuration Saved
    Note over AdminUI,OHIF: Later, when a user accesses a study...
    OHIF->>API: Fetch current user tool permissions
    API->>DB: Query Role Restrictions
    DB-->>API: Permissions Matrix
    API-->>OHIF: Return configuration
    OHIF->>OHIF: Initialize Viewer with restricted tools disabled
```
