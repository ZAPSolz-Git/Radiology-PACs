# TELERADIOLOGY SOFTWARE – USER ROLES & WORKFLOW

## 1. Overview

---

## 1. Technician User

### Functional Requirements – Technician User Interface

The Technician interface is designed to allow technicians to upload scans, patient data, and reports efficiently. It includes features for capturing new scans, uploading old reports or attachments via mobile/PC, and assigning cases to radiologists.

### 2. Actors

- **Primary Actor:** Technician
- **Secondary Actor:** Radiologist (for case assignment), Admin (user management)

### 3. Preconditions

- Technician must be logged in with valid credentials.
- Cases must be created or received from the center.
- Scans and patient data must be available for upload.

### 4. Postconditions

- Cases are uploaded successfully with correct patient data and history.
- Assigned radiologists receive cases for reporting.
- Uploaded attachments and scans are linked to the respective patient record.

### 5. Interface Layout

#### Main Panels/Sections:

#### 1. Case Upload Section

- Upload new scan images (DICOM, JPEG, or other supported formats).
- Capture images of old reports using mobile camera and upload.
- Enter or verify patient details:
  - Name
  - Age/Gender
  - Clinical history/case notes
- Upload attachments (old reports, lab results, images).

#### 2. Case List/Dashboard

- Display list of all uploaded cases:
  - Status (Assigned, Pending, Completed)
  - Assigned radiologist
  - Patient name & basic details
- Search and filter cases by date, patient name, or status.

#### 3. Action Buttons/Workflow Controls

- **Assign/Reassign:** Allocate cases to a specific radiologist.
- **Edit/Update:** Modify patient data or attachments before assignment.
- **Upload/Submit:** Finalize upload and send case to radiologist.
- **Preview:** View uploaded scans and attachments before submission.

#### 4. Notifications

- Alert when a case is successfully uploaded.
- Notify when a case is reassigned or returned for corrections.

### 6. Functional Requirements

- Technician can upload multiple scan formats.
- System should allow capturing and uploading images from mobile camera directly.
- Patient data must be validated before submission (mandatory: name and history).
- Assign/Reassign functionality must allow selection of radiologist from a dropdown list.
- Uploaded files and attachments must be linked to the correct patient record.
- Interface must be responsive for both desktop and mobile devices.

### 7. Security & Access Control

- Only authorized technicians can upload or modify cases.
- Audit trail for uploads, edits, and case assignments.
- Data encryption during upload and storage.

### 8. Optional/Advanced Features

- Bulk upload of scans or attachments.
- Predefined templates for entering patient history.
- Automatic notifications to radiologists when a new case is uploaded.
- Ability to mark urgent cases for priority reporting.

### Responsibilities:

- Register patient details (Name, Age, ID, Referring Doctor, etc.)
- Upload CT/MRI/X-ray images (DICOM) to the system
- Tag study type, body part, urgency (Routine/STAT)
- Track status: Uploaded → Assigned → Reported
- Communicate with admin/radiologist if needed

### Access Rights:

- Add/edit patient details before assignment
- Upload studies and track status
- Cannot edit radiologist reports
- No access to billing

---

## Scan Upload Options

### 1. DICOM File Upload

- Standard in radiology.
- Contains images + metadata (patient name, ID, modality, scan parameters).
- Usually uploaded into PACS/RIS/Teleradiology software.
- For clinical use & teleradiology, DICOM is always recommended because it carries both image + technical details.

### Other Available Formats (less preferred for reporting, but sometimes used):

- **JPEG/PNG/TIFF** → single images, but metadata is lost.
- **PDF** → sometimes when scans or reports are exported.
- **NIfTI (.nii)** → more in research/AI, not routine clinical.

---

## Required Patient & Case Information

When uploading for **teleradiology / reporting**, you should always attach:

### Patient Details

- Name
- Age / Date of Birth
- Gender
- Patient ID / Hospital Registration Number

### Clinical Information

- Referring doctor / hospital name
- Clinical history (reason for scan, symptoms, provisional diagnosis)
- Indication: *"Why the case is performed"* (e.g., trauma, headache, rule out stroke, staging of cancer)
- Relevant lab reports / old imaging if available

### Scan Information

- Modality: CT / MRI / X-ray etc.
- Body part (e.g., CT Brain, MRI Spine)
- Contrast given? (Yes/No, dose if available)
- Special instructions (post-op, follow-up, screening etc.)

> "The technician can also upload pictures, such as old reports containing patient data, by capturing them directly using a mobile camera and uploading them into the system.

> "Each case must include the correct patient name and medical history. For managing cases, there should be an option called **Assign** and **Reassign** to allocate or update the case to the appropriate doctor.

---

## 2. Admin User

### Functional Requirements – Admin User Interface

### 1. Overview

The Admin interface is designed to manage the overall system, including user roles, permissions, billing, workflow monitoring, and system configuration. Admin users ensure smooth operations between technicians, QA, and radiologists.

### 2. Actors

- **Primary Actor:** Admin
- **Secondary Actors:** Technician, QA, Radiologist, Billing team

### 3. Preconditions

- Admin must login with secure, elevated credentials.
- System must have defined user roles (Technician, QA, Radiologist).
- Database of cases, users, and billing records must be available.

### 4. Postconditions

- Admin can manage users, assign roles, and monitor workflows.
- Admin can track system usage, billing, and audit history.
- System configurations and permissions are updated as per Admin settings.

### 5. Interface Layout

#### Main Sections/Panels:

#### 1. Dashboard Overview

- Snapshot of overall system activity:
  - Number of cases uploaded, pending QA, assigned, completed
  - Current workload distribution among radiologists
  - Alerts for delayed or unassigned cases
  - Billing summary (if enabled)

#### 2. User Management Panel

- Add, edit, or deactivate users (Technician, QA, Radiologist, other admins).
- Assign roles and access levels.
- Reset passwords and manage login credentials.
- View last login, activity logs, and assigned cases.

#### 3. Case Monitoring & Workflow Control

- Track cases across the pipeline: Uploaded → QA → Radiologist → Finalized.
- Filter/search cases by patient, technician, radiologist, or status.
- Reassign cases if a user is unavailable.
- Force-close or archive cases if necessary.

#### 4. Billing & Reports Panel

- Generate billing records per case, per radiologist, or per center.
- Export billing data in PDF/Excel format.
- View financial summary (pending vs. completed cases).
- Link with external payment systems (optional).

#### 5. System Settings

- Configure data retention policies.
- Manage storage space and backup schedules.
- Define mandatory fields for technicians (patient name, history, etc.).
- Control notification preferences (email, SMS, system alerts).

#### 6. Audit & Security Panel

- Full audit trail of case uploads, edits, approvals, and reports.
- Logs of all user actions (who did what, when).
- Role-based access enforcement.
- Setup multi-factor authentication for sensitive accounts.

### 6. Functional Requirements

- Admin must have the ability to override assignments (reassign cases).
- Admin must be able to suspend or block users instantly if needed.
- Admin dashboard should display real-time system status.
- All actions performed by Admin must be logged for accountability.
- Billing data should be secure, exportable, and filterable.

### 7. Security & Access Control

- Only Admin users can access Admin features.
- Admin privileges should be role-based (e.g., Super Admin vs. Center Admin).
- Strong password policies and multi-factor authentication.
- End-to-end encryption for patient data and billing info.

### 8. Optional/Advanced Features

- AI-powered workload balancing (auto-assign cases to available radiologists).
- Automated SLA (Service Level Agreement) monitoring for turnaround times.
- Analytics dashboard (charts for workload, turnaround times, QA rejection rates).
- Multi-center management for admins handling multiple hospital/clinic accounts.

---

## 3. Radiologist User

### Functional Requirements – Radiologist User Interface

### 1. Overview

The Radiologist interface is designed to enable efficient review of scans, access to patient information, and creation or editing of reports. It provides a dual-pane layout with synchronized scan and report views, integrated patient history, attachments, and workflow controls.

When a case is received by the radiologist, the system must provide a dual-view interface. Both views should be synchronized, so the radiologist can seamlessly review the scan while preparing or verifying the report.

### 2. Actors

- **Primary Actor:** Radiologist
- **Secondary Actor:** Technician (case upload and assignment), Admin (user management)

### 3. Preconditions

- Radiologist must be logged in with valid credentials.
- Cases must be assigned to the radiologist using the Assign or Reassign workflow.
- Uploaded scans, patient history, and attachments must be available.

### 4. Postconditions

- Radiologist can view scans and reports simultaneously.
- Radiologist can add, edit, and finalize reports.
- Completed reports are saved in the system and linked to the corresponding scans.

### 5. Interface Layout

#### Dual-Pane Layout:

- **Left Panel/Section:** Full view of the uploaded scan (DICOM viewer or equivalent).
- **Right Panel/Section:** Full view of the corresponding report (editable and viewable).

The interface should allow resizing/switching between views if required (e.g., maximize scan or maximize report).

#### Left Pane – Scan Viewer

- Full view of the uploaded scan (DICOM or equivalent).
- Tools include:
  - Zoom, Pan
  - Windowing/Leveling (for CT/MRI)
  - Slice navigation (multi-slice scans)
  - Measurement tools (distance, area, annotation)
  - Cine/scroll mode for dynamic sequences

#### Right Pane – Report & History Viewer

**Report Section:**
- Editable report interface
- Predefined templates for common cases
- Free-text entry and formatting tools
- Auto-save and version history

**Patient History & Attachments Section:**
- View full patient history sent by the center
- View, preview, or download attachments (old reports, lab results, images)
- Read-only to prevent accidental edits
- Optional: Filter attachments by type or date

**Patient Details Section**
- Displayed at the top or in a collapsible panel
- Patient Name, Age, Gender
- Clinical notes/history
- Uploaded old reports or images

### 6. Workflow Controls/Action Buttons

- **Assign/Reassign:** Allocate cases to radiologist or transfer to another user
- **Save Draft:** Save work-in-progress report
- **Approve/Finalize:** Submit report as complete
- **Flag/Comment:** For queries or follow-ups
- **Download/Print:** Export scan or report
- Optional: Toggle between full-screen scan or full-screen report

### 7. Functional Requirements

- System must synchronize scan and report views.
- Radiologist can toggle between full-screen scan and full-screen report.
- Must support multiple scan formats (CT, MRI, X-ray).
- Reports automatically link to corresponding scans.
- Interface must load large scans efficiently without lag.
- Attachments and patient history must be visible alongside report for reference.

### 8. Security & Access Control

- Only authorized radiologists can access assigned cases.
- Audit trail for all report edits.
- Data encryption for patient information during upload/download.

### 9. Optional/Advanced Features

- Voice dictation for report entry
- AI-assisted preliminary report suggestions
- Comparison view with previous scans
- Highlighted abnormal regions (if AI module available)

### Responsibilities:

- Secure login to access assigned cases
- View DICOM images with viewer tools
- Report creation: dictation or structured templates
- Finalize with digital signature
- Communicate with referring doctors/admins

### Access Rights:

- View only assigned cases
- Write and finalize reports
- Apply digital signature
- Limited visibility of own earnings
- Cannot manage users or billing

---

## 4. Quality Analysis (QA) User

### Functional Requirements – Quality Analysis (QA) User Interface

### 1. Overview

The Quality Analysis (QA) interface ensures that all uploaded cases (scans, patient data, reports) are verified for accuracy, completeness, and compliance before final reporting. QA users act as a checkpoint between technicians and radiologists to maintain consistency and quality.

### 2. Actors

- **Primary Actor:** Quality Analyst
- **Secondary Actors:** Technician (case uploader), Radiologist (case reporter), Admin (user manager)

### 3. Preconditions

- QA user must be logged in with valid credentials.
- Cases must already be uploaded by technicians and assigned for QA review.
- Patient data, attachments, and scans must be accessible.

### 4. Postconditions

- Cases are verified for correctness and completeness.
- QA user can approve, reject, or send cases back for correction.
- Only approved cases are forwarded to radiologists.

### Interface Layout

#### Main Sections/Panels:

#### 1. Case Review Dashboard

- List of all cases pending QA review.
- Columns include:
  - Case ID/Patient Name
  - Technician Name (who uploaded)
  - Status (Pending QA, Approved, Sent Back, Completed)
  - Date of Upload
- Search and filter by status, date, patient name.

#### 2. Case Verification Panel

**Patient Information Panel:**
- Patient Name, Age, Gender
- Medical history/clinical notes
- Attachments (old reports, lab results)

**Scan Preview Panel:**
- Thumbnails or viewer for uploaded scans (basic tools like zoom/pan)

**Report Section (if draft available):**
- Preview of draft report uploaded by technician or generated template

#### 3. Action Controls

- **Approve Case:** Marks case as ready for radiologist review.
- **Send Back for Correction:** Returns case to technician with comments.
- **Reject Case:** Marks case invalid (wrong data, corrupted scans, etc.).
- **Add Comments/Notes:** QA can leave feedback for technician or radiologist.
- **Audit Trail Access:** View who uploaded/edited the case and when.

#### 4. Notifications

- Automatic notification to technicians if a case is sent back.
- Automatic notification to radiologists when a case is QA-approved.

### 6. Functional Requirements

- System must prevent incomplete cases from being sent to radiologists.
- QA must be able to check both patient data and scans before approval.
- Attachments must be viewable and downloadable.
- QA workflow should log all actions for auditing (approve, reject, send back).
- Comments added by QA must be visible to technicians and radiologists.

### 7. Security & Access Control

- Only authorized QA team members can review cases.
- QA team cannot modify scans or patient data, only verify and comment.
- Full audit trail of QA decisions must be maintained.

### 8. Optional/Advanced Features

- AI-assisted data validation (check for missing demographics, mismatched history).
- Automated flagging of low-quality or incomplete scans.
- Dashboard metrics for QA performance (number of cases reviewed, errors caught, turnaround time).

---

## 5. Billing & Finance

### Responsibilities:

- Maintain rate cards per case, modality, urgency
- Auto-generate invoices for hospitals/clinics
- Track radiologist payouts (per case % or fixed fee)
- Export billing data to ERP/finance software

### Workflow:

1. Technician uploads case
2. Admin assigns case to Radiologist
3. Radiologist reports & finalizes
4. Report delivered to hospital
5. Billing system updates invoice
6. Radiologist payout calculated
7. Hospital pays provider

---

## 4. Parameters

### Image Viewing & Manipulation Tools

- **Pan** – Move image position.
- **Zoom** – Enlarge/reduce view.
- **Rotate Clockwise** – Rotate image 90° clockwise.
- **Rotate** – Free rotation of image.
- **Flip Right/Left** – Horizontal mirroring.
- **Inverse Image** – Invert grayscale.
- **Sort by Instance ID** – Order images in sequence.
- **Reset** – Return to default view.
- **Magnifier** – Small zoomed-in lens.

### Annotation & Measurement Tools

- **Crosshair** – Precise locator cross.
- **Circle** – Circular ROI.
- **Rectangle** – Rectangular ROI.
- **Polygon** – Custom shape ROI.
- **Line** – Straight line measurement.
- **Pixel Value** – HU/Pixel information.
- **Angle** – Angle measurement.
- **Arrow** – Pointing marker.
- **Text** – Free text annotation.
- **Delete** – Remove selected annotation.

### Image Controls

- **Window Width/Window Level (WW/WL)** – Contrast & brightness adjustment.
- **Browser Layout** – Change how studies are arranged in browser.
- **Image Layout** – 1x1, 2x2, 3x3 grid layouts, etc.
- **Compare Series** – Side-by-side study comparison.
- **Image Locator on Slide** – Reference locator bar on scout view.

### Multimedia & Associated Data

- **Video Play** – Play cine loops.
- **Location Image** – Show slice location on reference image.
- **Associated Image** – Attach/view linked images.