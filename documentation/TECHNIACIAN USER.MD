# 👨‍🔧 TECHNICIAN USER - FEATURES

## Workflow Overview

```
┌──────────────────────────┐
│ TECHNICIAN LOGIN         │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ CREATE / SELECT CASE     │
│ • New Patient            │
│ • Existing Patient       │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ IMAGE UPLOAD             │
│ • PACS (Auto)            │
│ • Manual Import          │
└─────────────┬────────────┘  
              │
              ▼
┌──────────────────────────┐
│ PATIENT DETAILS & HISTORY│
│ • Edit Name / Age / Sex  │
│ • Add / Edit History     │
│ • Chat with Doctor       │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ EMERGENCY CHECK          │
│ • Normal Case            │
│ • Mark as Emergency      │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ NOTIFICATIONS SENT       │
│ • QA Team (WhatsApp)     │
│ • Emergency → Immediate  │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ VIEWING PANEL            │
│ • Scroll Series          │
│ • Zoom / Windowing       │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ REPORT STATUS TRACKING   │
│ • Pending                │
│ • Approved / Rejected    │
│ • Final                  │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ FINAL REPORT ACCESS      │
│ • Download PDF           │
│ • Print                  │
│ • Share via Email/WhatsApp│
└──────────────────────────┘
```

## Case Creation, Image Handling & Workflow

### 1. Case Creation & Image Upload

- Technician can upload imaging studies from CT / MRI / X-Ray systems via PACS (automatic upload)
- **PACS Image Upload (Auto Data Reading):** When images are uploaded through PACS, the system should automatically read and populate patient metadata from DICOM headers, including Patient Name, Age, Gender, Referring Doctor, Study Date, and Modality, eliminating the need for manual data entry and reducing errors
- **Manual upload options** available when PACS is not used:
  - Import images manually
  - Export images manually

### 2. Patient History & Communication

- Technician can add patient clinical history
- History can be:
  - Edited / rewritten
  - Deleted if required (before assigning)
- Single combined icon for:
  - Patient history entry
  - Chat with reporting doctor
- **History Section - File Upload (Device Storage Access):** Within the patient history section, technicians can upload supporting documents and images directly from device storage, including PDF files and JPG images (camera-captured or stored files), which will be attached to the case for doctor reference

### 3. Doctor Communication (Secure Chat)

- In-software chat facility with reporting doctor
- Technician cannot see doctor's personal contact number
- Chat conversation is visible to:
  - Quality Analysis (QA) team
  - Admin
- No external contact details shared with technician

### 4. Patient Details Management

Technician can edit patient demographics, including:
- Patient Name
- Age
- Gender
- Referring Doctor
- Study details

### 5. Image Sharing (View-Only Access)

Technician can send secure image links via:
- Email
- WhatsApp

**Link features:**
- View-only access (no download)
- Only assigned patient images visible
- Allowed functions:
  - Series scrolling
  - Image zoom
  - Windowing
- No editing or export allowed

### 6. Report Handling

Technician can:
- Download report in PDF format
- Edit reports within the same software (if permitted)
- Print reports directly from the system

### 7. Report Status Tracking

Each case will have a clear report status:
- **Pending**
- **Approved**
- **Rejected**
  - Rejection reason mandatory (e.g.):
    - Poor image quality
    - Incomplete study
    - Wrong study uploaded
- **Final**

### 8. Emergency Case Flagging

- Technician can mark a case as Emergency
- Immediate notification sent to QA team

### 9. Image Upload Notifications

Once images are uploaded by technician:
- Automatic WhatsApp notification sent to the Quality Team

### 10. Final Report Distribution

After report is finalized:
- Report automatically sent to:
  - Technician
  - Hospital / Center
- Delivery through:
  - Registered mobile number
  - Registered email ID (as configured)

### 11. Viewing Panel Access

- Technician will have a dedicated image viewing panel
- Viewing panel details will be defined separately under Viewing Features

### 12. Study Search & Filters

Technician can easily search studies using:
- Patient name
- Study date
- Modality
- Accession number / ID

### 13. User Interface & Usability

System should be:
- Easy to operate
- All functions clearly visible
- Minimal training required for technicians

## Technician Workflow & UI

1. Icons (View Image, Order Notes, etc.) should be inside the report table for faster access
2. UI must be responsive for technicians (desktop + mobile)
   - UI designer will provide mobile layout
3. **Technician-only permissions:**
   - Add/remove letterhead in report
   - Upload images and PDFs

## Advanced Features

### 1. Smart Study Validation (Before Upload)

System automatically checks:
- Correct modality (CT / MRI / X-Ray)
- Body part vs selected study type
- Missing series or incomplete study

Warning pop-up shown before final upload:
> "Study appears incomplete. Please verify."

✅ Reduces QA rejections  
✅ Saves doctor time

### 2. Technician Checklist (Mandatory Before Submission)

Tick-box checklist before case submission:
- Patient details verified
- Correct study selected
- History added
- All series uploaded

Submission allowed only after checklist completion.

📌 Prevents wrong uploads & legal issues

### 3. Auto History Templates

One-click history templates:
- "Headache -- CT Brain"
- "RTA -- Whole Body CT"

Technician can edit before submission.

⏱ Saves time  
📋 Improves report quality

### 4. Turnaround Time (TAT) Countdown

Live timer visible to technician:
- Time remaining for report delivery

Color coding:
- **Green** → On time
- **Orange** → Approaching delay
- **Red** → SLA breach risk

### 5. Offline Upload Queue

If internet fails:
- Studies saved locally
- Auto-sync once internet restores

🌐 Ideal for semi-urban / rural centers

### 6. One-Click Rejection Fix Mode

When QA rejects a study:
- Technician gets:
  - Highlighted rejection reason
  - Direct option to re-upload missing images
- Previous upload remains preserved

🔁 Faster correction cycle

### 7. Case Priority Tagging

Priority labels:
- Routine
- Urgent
- Emergency

Visible to QA & Doctors instantly

## One-Click History Templates (Technician)

### General / Default

- **Routine Check-up**  
  *Patient referred for routine imaging evaluation.*

- **Pain Evaluation**  
  *Patient presents with pain in the concerned region.*

### CT Templates

- **CT Brain -- Stroke**  
  *Sudden onset weakness / altered sensorium. Rule out stroke.*

- **CT Brain -- Head Injury**  
  *History of trauma. Loss of consciousness / vomiting.*

- **CT Chest**  
  *Cough, breathlessness, fever. Rule out lung pathology.*

- **CT Abdomen**  
  *Abdominal pain. Rule out intra-abdominal pathology.*

### MRI Templates

- **MRI Brain**  
  *Headache / seizures / neurological symptoms.*

- **MRI Spine**  
  *Back pain with or without radiculopathy.*

- **MRI Knee**  
  *Knee pain following trauma / chronic pain.*

### X-Ray Templates

- **X-Ray Chest**  
  *Fever / cough / pre-operative evaluation.*

- **X-Ray Limb**  
  *Pain or swelling following trauma.*

### NAD / Normal Study

- **No Significant History (NAD)**  
  *No relevant clinical history provided.*

### Technician Controls

- Templates selectable with one click
- Technician can:
  - Edit or rewrite text
  - Delete history if required
- Selected history auto-attaches to the study before submission

---

## How One Patient Can Have Multiple Case Studies

Based on the document, here's how a single patient can have multiple case studies:

### 1. **Create/Select Case Flow**
At the beginning of the workflow, there's an explicit option:
- **New Patient** - Creates a completely new patient record
- **Existing Patient** - Selects an already registered patient

### 2. **Multiple Studies Over Time**
A patient can return for different imaging studies:
- **Different dates**: Patient gets CT scan today, MRI next month
- **Different body parts**: CT Brain on one visit, X-Ray Chest on another
- **Different conditions**: Initial injury scan, follow-up scan, unrelated condition scan
- **Different modalities**: CT, MRI, and X-Ray studies for the same patient

### 3. **Search & Retrieval**
The system supports finding all studies for a patient through:
- Patient name search
- Study date filtering
- Modality filtering
- Accession number/ID

### 4. **Practical Examples**

**Example 1: Follow-up Cases**
- Case 1: Jan 15, 2026 - CT Brain (Head injury)
- Case 2: Jan 22, 2026 - CT Brain (Follow-up scan)
- Case 3: Feb 5, 2026 - X-Ray Chest (Unrelated respiratory issue)

**Example 2: Multi-body Part Trauma**
- Case 1: CT Brain (Head injury from accident)
- Case 2: X-Ray Limb (Arm fracture from same accident)
- Case 3: CT Abdomen (Internal injury assessment)

### 5. **System Design Implications**
- Each **case** has its own unique ID/accession number
- Each case has its own:
  - Image upload
  - Patient history
  - Report status
  - TAT countdown
  - QA workflow
- Patient demographics remain linked across all cases
- Historical studies are searchable and accessible

This structure allows the system to maintain a comprehensive medical imaging history for each patient while treating each imaging study as a separate case with its own workflow and documentation.