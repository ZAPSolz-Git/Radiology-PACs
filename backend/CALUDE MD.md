🏥 Armorray — Radiology Information System (RIS) Backend
This is the backend for Armorray (armorray.com), a full-featured teleradiology / Radiology Information System platform. Here's everything I understood:

🛠️ Tech Stack
Layer	Technology
Runtime	Node.js + Express 5 (ESM modules)
Database	MongoDB via Mongoose
Real-time	Socket.io + Redis adapter
Caching/Sessions	Redis (ioredis)
AI Microservice	Python FastAPI (separate service on port 5000)
DICOM Protocol	dcmjs-dimse + dicom-dimse-native
PACS Server	Orthanc integration
Auth	JWT + HTTP-only cookies + refresh tokens
Docs	Swagger UI (dev only)
Logging	Winston + Morgan
PDF/DOCX	Puppeteer + pdf-lib + docx + html-to-docx
👥 User Roles
Admin — full platform control
Radiologist — reads images, writes reports
Technician — uploads cases, manages DICOM files
QA — quality assurance, audits reports
Institution — hospital/clinic accounts
User — general access
🔄 Case Lifecycle (The Core Workflow)

Uploaded → QA_Pending → QA_Review → Assigned → In_Progress
    → QA_Audit → Rep_Correction ↔ (loop)
    → Finalized  (medico-legal lock)
    → Rejected   (sent back to tech)
    → Incomplete (interrupted PACS transfer)
Each state change is recorded in a timeline (full audit trail per case).

🧩 Key Modules & Routes
Route	Purpose
/api/auth	Login, register, refresh tokens, password management
/api/patients	Patient records (CRUD)
/api/cases	Core case management (upload, assign, DICOM files, attachments)
/api/qa	QA review workflow
/api/radiologist	Radiologist-specific endpoints
/api/reports	Report drafting, submission, finalization (DOCX generation)
/api/templates	Report templates
/api/macros	Text macros for faster reporting
/api/billing	Tariffs & billing per case
/api/payouts	Radiologist payment tracking
/api/analytics	Performance analytics
/api/pacs	DICOM PACS integration (C-ECHO, C-FIND, C-MOVE)
/api/orthanc	Orthanc PACS server proxy
/api/performance	Radiologist turnaround time stats
/api/admin	Admin panel operations
/api/backups	Database/system backup management
/api/banners	System-wide announcements
/api/share-links	Secure time-limited case sharing tokens
/api/admin/api-keys	External partner API key management
/api/v1/external	Webhooks for 3rd party integrations
/api/internal	Internal service-to-service communication
🧠 AI Microservice (Python FastAPI)
A separate Python service that analyzes DICOM images with:

Blur Detection — checks image sharpness quality
Motion Detection — detects motion artifacts (for MRI, CT, X-Ray)
Contrast Analyzer — checks contrast injection quality
Body Part Validator — validates correct anatomy was scanned
It runs asynchronously with a callback URL back to the Node.js backend to update case integrityResults.

🔬 DICOM Integration
Supports C-ECHO (ping PACS), C-FIND (query studies), C-MOVE (pull images), C-STORE (receive images)
Has a DICOM SCP listener that runs on startup to receive files pushed from PACS
Cases can come from: FOLDER_UPLOAD, PACS_IMPORT, or PACS_PUSH
💰 Billing & Payouts
Tariff model defines pricing per modality/body part
When a case is finalized, billing info is snapshot-locked (can't change)
Invoices go to institutions/technicians (monthly billing)
Payouts go to radiologists (per-period earnings)
🔐 Security
Helmet headers, HSTS, X-Frame-Options, Permissions-Policy
Rate limiting (general + stricter on auth routes)
NoSQL injection protection (mongo-sanitize)
JWT + httpOnly cookies with refresh token rotation
Account lockout after failed login attempts
Full AuditLog model tracking every action (AUTH, CASE_WORKFLOW, FINANCIAL, SECURITY_CONFIG, etc.)
⚡ Real-time
Socket.io initialized at startup for live notifications (case status updates, report submissions, etc.)
📋 In summary:
This is a production-grade teleradiology platform that manages the end-to-end radiology workflow — from receiving DICOM images (via upload or PACS), through QA verification, radiologist assignment, AI quality checks, report writing, and finally billing/payouts. It's essentially a complete RIS (Radiology Information System) tailored for remote radiology services.


🖥️ Armorray Frontend
🛠️ Tech Stack
Layer	Technology
Framework	React 18 + TypeScript
Build Tool	Vite + SWC
Styling	Tailwind CSS + shadcn/ui (Radix UI components)
State Management	Zustand (global), MobX (viewer), TanStack Query (server state)
Routing	React Router v6
Forms	React Hook Form + Zod validation
Charts	Recharts
Real-time	Socket.io client
Rich Text Editor	Tiptap v3 (with tables, images, color, alignment)
Icons	Lucide React + React Icons
Testing	Vitest + Testing Library
Offline	Service Worker (upload queue)
📐 App Structure — Role-Based Dashboards
The app routes each user to a completely different dashboard based on their role:


/                        → Public landing/homepage
/login                   → Login page
/dashboard/technician    → Technician dashboard
/dashboard/radiologist   → Radiologist dashboard
/dashboard/qa            → QA dashboard
/dashboard/admin         → Admin dashboard
/dashboard/user          → User/patient dashboard
🔐 Feature Breakdown by Role
👷 Technician Dashboard
Study/case table with filter bar (modality, status, urgency)
Case creation modal — upload DICOMs + patient details
DICOM Manager — manage uploaded DICOM files
PACS Settings — configure PACS connections (AE title, IP, port)
PACS Received Panel — view studies pushed from PACS
Assign radiologist modal
Billing view (see what each case costs)
Secure Chat per case
Notification center (real-time Socket.io)
Share Link modal — create time-limited share links
Offline sync — queues uploads when offline, syncs when back
History manager (clinical history templates)
Sync status badge
🩺 Radiologist Dashboard
Worklist — list of assigned cases with filters (modality, status, urgency, date)
Reporting Editor — the core feature:
Tiptap rich-text editor for writing reports
Voice dictation via react-speech-recognition
Templates sidebar — apply pre-made report templates
Macros — keyboard shortcut text expansion
Intelligence Sidebar — search/apply/manage templates & macros
Signature modal — apply digital signature
DOCX export
Save draft / Finalize report
Performance Analytics — TAT, volume, productivity charts
Earnings / Payout history
Open DICOM viewer (external)
Case details modal
Case timeline modal
Chat per case
Rejection modal
🔍 QA Dashboard
Reception Queue — incoming cases needing QA
Verification View — structured QA checklist:
Identity comparison (patient demographics check)
Quality checklist (image quality, protocol, contrast)
Rejection flow
Assignment Manager + Doctor Discovery — find & assign radiologists
Report Verification — review finalized reports
Banner Sidebar — manage report letterhead banners
Case Chat Hub
🛡️ Admin Dashboard (14 Sections)
Section	What it does
User Directory	Create/manage users, roles, status
Browse Studies	Browse all DICOM studies
PACS Vault	Orthanc server admin
Viewer Config	Role-based tool permissions per viewer
Security Engine	Security policies, hardening
Audit Trails	Full audit log + login activity
Workflow Feed	Live case throughput
SLA Monitor	TAT & deadline tracking
Alert Center	Automated alerts
Tariff Master	Pricing per modality/body part
Hospital Billing	Invoice management
Doctor Payouts	Radiologist payout console
Revenue Hub	Financial analytics
Snapshot Vault	Backup & recovery
API Keys	External API key management
🏥 DICOM Viewer — The Key Answer
There are TWO viewer layers:

1. 🔵 OHIF Viewer (Primary — External Service)

// In radiologist dashboard, "View Study" button:
window.open(`${VITE_OHIF_URL || 'http://localhost:3000'}/basic?StudyInstanceUIDs=...`, '_blank');
OHIF (Open Health Imaging Foundation) is used as the primary DICOM viewer — it runs as a completely separate service on port 3000, and is launched in a new browser tab when a radiologist clicks "View Study". This is the production viewer.

2. 🟡 Custom Cornerstone.js Viewer (Built In-House — WIP/Commented Out)
The project has a full custom viewer being built using:

@cornerstonejs/core v2
@cornerstonejs/dicom-image-loader
@cornerstonejs/tools
It has all the infrastructure:

CornerstoneService — init, WebGL GPU setup, rendering engine
StudyLoaderService, VolumeService, MPRViewer (axial/sagittal/coronal)
MeasurementService, HangingProtocolService, ImagePrefetchService
CacheManager, MemoryMonitor, ProgressiveLoaderService
Viewport grid, cine player, thumbnails, measurements panel, colormaps
BUT — DicomViewer.tsx and DicomViewerLayout.tsx are 100% commented out. The custom viewer is built but not yet wired into the UI. The plan seems to be to replace/complement the OHIF viewer with this custom one in a future phase.

🧠 Summary
The frontend is a role-based SPA where each user (technician, radiologist, QA, admin) gets a tailored workflow dashboard. The current DICOM viewing is handled by an external OHIF instance on port 3000. A fully custom Cornerstone.js v2 viewer is in active development (all services are written, the UI components are built but commented out, likely being tested/completed for future integration).