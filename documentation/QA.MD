
---
🧑‍💼  QUALITY ANALYZER (QA USER)

 Technician
        │
        ▼
QA Receives Study
        │
        ▼
QA Verifies
(Patient Data + Images)
        │
 ┌──────┴──────┐
 │             │
 ▼             ▼
Reject       Approve
(with reason)   │
 │              ▼
 │        Assign Doctor
 │              │
 │              ▼
 │        Doctor Reports
 │              │
 │              ▼
 │        QA Reviews Report
 │              │
 └──────► Recheck if needed
                │
                ▼
         Final Approval
                │
                ▼
        Report Sent to Hospital
Coordinating Role Between Technician & Doctor
The Quality Analyzer team acts as the central coordination layer between hospitals, technicians, and reporting doctors to ensure data accuracy, image quality, and reporting standards.



1. **Study Reception & Notifications**
   1.1. Receive new study notification
   1.1.1. Trigger: Technician uploads study.
   1.1.2. System creates a New Cases Queue entry.
   1.1.3. Push notification to QA (in-app + optional email).
   1.1.4. Log timestamp and source hospital/center.

1.2. Case metadata indexing
1.2.1. Extract patient demographics, modality, study type, clinical history.
1.2.2. Extract image series list, image counts, and file checksums.
1.2.3. Store metadata for audit and search.

---

2. **Initial Data & Image Verification (QA)**
   2.1. Patient identity verification
   2.1.1. Check patient name against hospital-provided record.
   2.1.2. Verify age / gender / sex fields.
   2.1.3. Verify clinical history exists and is relevant to study.

2.2. Image completeness & integrity check
2.2.1. Confirm required series are present for the modality.
2.2.2. Confirm file integrity (no corruption).
2.2.3. Confirm non-duplication and correct study UID.

2.3. Image quality quick-check
2.3.1. Detect obvious blur / motion artifacts.
2.3.2. Confirm sequences/coverage adequate for reporting.
2.3.3. Flag missing sequences or incomplete coverage.

2.4. Communication on data issues
2.4.1. If metadata missing/incorrect → send in-system chat to Technician with field-level notes.
2.4.2. If images insufficient → request re-scan or additional upload from Technician via chat.
2.4.3. Attach standardized rejection templates where applicable (see § Structured Rejection Templates).

---

3. **Study Acceptance & Approval (QA)**
   3.1. Approve or Reject decision
   3.1.1. If all checks pass → QA approves study.
   3.1.2. If fails → QA rejects with reason and required remedial actions.

3.2. Post-approval actions
3.2.1. Move study to Doctor Assignment Queue.
3.2.2. Send immediate assigned-doctor notifications (in-app + SMS/email as configured).
3.2.3. Send WhatsApp notification to assigned doctor *after* sending scan (explicit requirement).
3.2.4. Timestamp approval and note QA operator ID.

---

4. **Doctor Assignment & Management**
   4.1. Doctor discovery & filtering
   4.1.1. Display list of available doctors.
   4.1.2. Show online/offline status and current workload.
   4.1.3. Filter by modality and sub-specialty.

4.2. Smart match & manual override
4.2.1. Auto-suggest doctor(s) using Smart Doctor Matching Engine (see § Smart Doctor Matching).
4.2.2. Allow QA to override and manually assign.

4.3. Assignment notification & acceptance
4.3.1. Notify assigned doctor immediately (in-app + WhatsApp + email as configured).
4.3.2. Track whether doctor opens the case; record timestamp.

4.4. Reassignment controls
4.4.1. QA can reassign at any time; previous context (chats, rejection reasons, notes) follows the case.
4.4.2. One-Click Reassignment option available with context auto-carried (see § One-Click Reassignment).

---

5. **Edit & Image Management Rights (QA)**
   5.1. Edit permissions
   5.1.1. QA can edit patient details and study information (log and timestamp every edit).
   5.1.2. Edits are auditable and recorded per user.

5.2. Image upload & attachments
5.2.1. QA can upload additional images or series.
5.2.2. QA can attach previous/old scans from internal PACS to the study.
5.2.3. Uploaded/attached images are versioned and timestamped.

5.3. Limits & approvals
5.3.1. Sensitive edits after finalization require admin approval (see § Medico-Legal Lock Mode).

---

6. **Image Quality Assurance (Detailed)**
   6.1. Automated QA tags (AI-assisted)
   6.1.1. AI flags blurry images, motion artifacts, missing series, wrong body part selection.
   6.1.2. QA sees AI warning tags on the case before approval.

6.2. Manual QA checks & markings
6.2.1. QA reviews flagged areas and confirms or dismisses AI flags.
6.2.2. QA can add notes requesting re-scan, specific repeat sequences, or additional acquisitions.

6.3. Remedial workflows
6.3.1. If re-scan required → trigger technician notification with precise instructions.
6.3.2. If additional series can be uploaded → provide upload link and acceptance criteria.

---

7. **Secure Communication System**
   7.1. Chat channels
   7.1.1. One-to-one: QA ↔ Doctor.
   7.1.2. One-to-one: QA ↔ Technician.
   7.1.3. Group chat: QA + Doctor + Technician.

7.2. Privacy & masking
7.2.1. Personal phone numbers masked; system provides virtual numbers.
7.2.2. All messages stored and time-stamped for audit; read receipts tracked.

7.3. Message attachments
7.3.1. Allow attaching images, screenshots, prior study refs, and structured rejection templates to chats.

---

8. **Doctor Rejection Handling**
   8.1. Doctor rejection flow
   8.1.1. Doctor provides rejection reason via structured form or free-text.
   8.1.2. System notifies QA with the rejection reason and timestamps.

8.2. QA actions on rejection
8.2.1. QA reviews reason, inspects images/reports.
8.2.2. QA communicates with Technician for corrections if needed.
8.2.3. QA may reassign the study to another doctor if appropriate.

8.3. Escalation & logging
8.3.1. If repeated rejections occur → notify Admin and log for QA/Doctor performance analytics.

---

9. **Report Review & Recheck Workflow**
   9.1. Doctor completes report
   9.1.1. Doctor submits preliminary/final report to QA queue.

9.2. QA report review
9.2.1. QA checks report format, required sections, and clinical clarity.
9.2.2. QA confirms that findings match images/key images and clinical history.

9.3. Recheck loop
9.3.1. If unsatisfactory → QA returns to doctor with structured recheck notes via chat.
9.3.2. Track number of rechecks and timestamps.
9.3.3. If assigned doctor unavailable → QA can reassign to alternate doctor.

9.4. Final approval
9.4.1. After QA signs off, mark report as QA-approved and proceed to dispatch.

---

10. **Key Image Selection**
    10.1. Key-image marking
    10.1.1. QA can mark and annotate key images/frames.
    10.1.2. QA can add captions/notes to marked key images.

10.2. Inclusion in report delivery
10.2.1. Ensure marked key images are attached to final report package.

---

11. **Final Report Dispatch**
    11.1. Delivery targets
    11.1.1. Send final report to concerned hospital and diagnostic center.
    11.1.2. Support multiple delivery channels: email, system portal, WhatsApp (per configuration).

11.2. Packaging & metadata
11.2.1. Include final report (PDF), marked key images, and audit trail summary.
11.2.2. Include QA operator ID and final approval timestamp.

11.3. Confirmation & logging
11.3.1. Capture delivery receipt/confirmation where possible.
11.3.2. Log delivery method, recipient, and timestamp.

---

12. **Complete Audit & Control**
    12.1. Visibility & logs
    12.1.1. QA has full visibility of case status, doctor actions, technician uploads, and chat history.
    12.1.2. All actions are time-stamped and stored for audit.

12.2. Reporting & exports
12.2.1. Ability to export case timelines, action logs, and attachments for legal review.

---

13. **AI-Assisted QA Check (Pre-Doctor)**
    13.1. Auto-detection rules
    13.1.1. Automatically flag blurry images, motion artifacts, missing series, wrong body part.
    13.1.2. Provide severity levels and confidence scores.

13.2. QA presentation
13.2.1. Show AI warning tags prominently to QA prior to approval.
13.2.2. Allow QA to accept/dismiss AI suggestions and add manual notes.

13.3. Continuous learning loop
13.3.1. Feed QA decisions back to model to improve detection accuracy.

---

14. **Smart Doctor Matching Engine**
    14.1. Input factors for matching
    14.1.1. Modality, sub-specialty, doctor workload, current availability, past performance score.
    14.1.2. Scheduling constraints and time zones.

14.2. Suggestion & override flow
14.2.1. Auto-suggest top N doctors sorted by suitability.
14.2.2. QA can accept or override suggestions.

14.3. Monitoring & metrics
14.3.1. Track assignment success, completion times, and escalation triggers.

---

15. **SLA & TAT Heatmap Dashboard**
    15.1. Dashboard items
    15.1.1. Cases nearing SLA breach (color-coded: Green/Amber/Red).
    15.1.2. Delayed doctors and emergency backlog.

15.2. Alerts & notifications
15.2.1. Real-time alerts for cases breaching thresholds.
15.2.2. SLA breach auto-escalation rules (see § Auto-Escalation).

15.3. Management view
15.3.1. Exportable snapshots for management/board reviews.

---

16. **Auto-Escalation Rules**
    16.1. Trigger conditions
    16.1.1. Doctor does not open case in X minutes (e.g., 30 minutes).
    16.1.2. Report not completed within defined TAT.

16.2. Escalation targets & actions
16.2.1. Auto-escalate to QA and Admin with case context.
16.2.2. Optionally auto-reassign to backup doctor.

16.3. Notifications & logging
16.3.1. Send escalation notifications via in-app, email, and configured channels.
16.3.2. Log escalation reason and timestamps.

---

17. **One-Click Reassignment with Context**
    17.1. Reassignment payload
    17.1.1. Move previous chats, rejection reasons, QA notes, and audit trail with case.
    17.1.2. Maintain original timestamps and references.

17.2. UI & workflow
17.2.1. Provide a single UI action to reassign with confirmation.
17.2.2. Notify newly assigned doctor and archive previous assignment event.

---

18. **Structured Rejection Templates**
    18.1. Pre-defined reasons
    18.1.1. Poor image quality.
    18.1.2. Incomplete study.
    18.1.3. Wrong protocol / body part.
    18.1.4. Incorrect patient data.

18.2. Custom notes & reuse
18.2.1. QA can add custom notes to templates.
18.2.2. Templates speed up communication and ensure consistency.

---

19. **QA Performance Analytics**
    19.1. KPIs tracked
    19.1.1. Number of cases handled.
    19.1.2. Error rate and re-assignment frequency.
    19.1.3. Average QA turnaround time.

19.2. Dashboards & exports
19.2.1. Weekly/monthly QA performance reports.
19.2.2. Drill-down per QA operator.

---

20. **Doctor Quality Scorecard**
    20.1. Scoring inputs
    20.1.1. Number of recheck requests.
    20.1.2. Report turnaround time.
    20.1.3. QA corrections and feedback.

20.2. Usage
20.2.1. Doctor ranking and contract renewal decisions.
20.2.2. Provide doctor-facing feedback reports.

---

21. **Case Timeline View (End-to-End)**
    21.1. Timeline elements
    21.1.1. Upload time (technician).
    21.1.2. QA approval time.
    21.1.3. Doctor assignment and report times.
    21.1.4. Report finalization and dispatch.

21.2. UI features
21.2.1. One-screen overview with clickable events to expand detail.

---

22. **Medico-Legal Lock Mode**
    22.1. Lock conditions
    22.1.1. Once report is finalized, lock images, report, and chat as read-only.
    22.1.2. Any amendment attempts require admin approval and reason logging.

22.2. Audit & access
22.2.1. Store who requested change, who approved, and why.
22.2.2. Maintain immutable copies for legal compliance.

---

23. **Center-Wise Quality Analytics**
    23.1. Metrics by center
    23.1.1. Rejection rates per hospital/center.
    23.1.2. Common error types by center (e.g., protocol issues).

23.2. Actionable insights
23.2.1. Provide targeted training suggestions to centers with repeat issues.
23.2.2. Exportable center-quality reports.

---

24. **General System Requirements & Non-functional Tasks**
    24.1. Auditing & security
    24.1.1. All actions logged, encrypted at-rest and in-transit.
    24.1.2. Role-based access control for QA, Doctor, Technician, Admin.

24.2. Notifications & integrations
24.2.1. WhatsApp integration for doctor notifications (post-scan send).
24.2.2. Email and portal delivery integration.

24.3. Data retention & compliance
24.3.1. Retention policies configurable per hospital/legal requirement.
24.3.2. Export and e-discovery capabilities.

24.4. Performance & scalability
24.4.1. Queue and worker model for processing high-volume uploads.
24.4.2. SLA monitoring and auto-scaling for peak loads.

---

25. **Implementation Handover Checklist (for downstream AI)**
    25.1. Verify all input/output contracts (APIs) for: upload, notifications, PACS attach, doctor assignment, chat.
    25.2. Confirm AI model endpoints and feedback loop for AI-assisted QA flags.
    25.3. Confirm WhatsApp/channel configuration and masking rules.
    25.4. Ensure audit logging and medico-legal lock behaviors are immutable.
    25.5. Validate all templates (rejection, recheck) exist and are editable via admin UI.
