# Armorray Platform — External API Integration Guide
**Version:** 1.0.0
**Target Partner:** 5C Network

This document outlines the REST API endpoints provided by the Armorray Platform for automated machine-to-machine integration. It covers fetching case metadata and syncing finalized reports.

---

## 1. Authentication
All external API endpoints are secured using a static API Key. 

You must include the API Key in the headers of **every** request using the `armorray-api-key` header.

```http
armorray-api-key: ak_5cnetwor_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **Note:** API Keys are tied to specific permissions (scopes). Ensure your key has both `read:cases` and `write:reports` scopes enabled by the system administrator.

---

## 2. Rate Limiting & IP Whitelisting
- **Rate Limit:** By default, keys are limited to **100 requests per minute**. Exceeding this will return a `429 Too Many Requests` status.
- **IP Whitelisting:** If an IP whitelist is configured for your API key, requests originating from unauthorized IP addresses will be rejected with a `403 Forbidden` status.

---

## 3. Endpoints

### 3.1 Fetch Cases by Patient ID
Fetches a list of all cases associated with a specific Patient ID (MRN). Use this to poll or retrieve historical cases when a patient arrives.

- **URL:** `/api/v1/external/cases/{patientId}`
- **Method:** `GET`
- **Required Scope:** `read:cases`

**Query Parameters (Optional):**
- `dateFrom` (YYYY-MM-DD): Filter cases created on or after this date.
- `dateTo` (YYYY-MM-DD): Filter cases created on or before this date.

**Example Request:**
```bash
curl -X GET "https://api.armorray.com/api/v1/external/cases/P-12345" \
     -H "armorray-api-key: ak_5cnetwor_your_key_here"
```

**Example Response:**
```json
{
    "success": true,
    "message": "Cases retrieved",
    "data": [
        {
            "caseId": "69eb1a07ff46a208cf8914cf",
            "patientId": "P-12345",
            "patientName": "John Doe",
            "age": 45,
            "gender": "M",
            "modality": "CT",
            "study": "CHEST",
            "clinicalHistory": "Chronic cough, fever. Rule out pneumonia.",
            "clinicalQuery": "",
            "referringPhysician": "Dr. Smith",
            "contrast": "No",
            "accessionNumber": "ACC-998877",
            "institution": "City Hospital",
            "studyInstanceUID": "1.2.840.1.99.1.47.1.1740210300370.16",
            "studyDate": "2026-04-24T07:21:43.410Z",
            "urgency": "Routine",
            "isEmergency": false,
            "status": "Uploaded",
            "expectedFiles": 154,
            "createdAt": "2026-04-24T07:21:43.421Z"
        }
    ]
}
```

---

### 3.2 Fetch Specific Case Detail
Fetches detailed metadata for a single specific case, including full DICOM Series metadata (which allows you to map incoming images via Vortex to this case).

- **URL:** `/api/v1/external/cases/{patientId}/{caseId}`
- **Method:** `GET`
- **Required Scope:** `read:cases`

**Example Request:**
```bash
curl -X GET "https://api.armorray.com/api/v1/external/cases/P-12345/69eb1a07ff46a208cf8914cf" \
     -H "armorray-api-key: ak_5cnetwor_your_key_here"
```

**Example Response:**
```json
{
    "success": true,
    "message": "Case retrieved",
    "data": {
        "caseId": "69eb1a07ff46a208cf8914cf",
        "patientId": "P-12345",
        "patientName": "John Doe",
        "age": 45,
        "gender": "M",
        "modality": "CT",
        "study": "CHEST",
        "clinicalHistory": "Chronic cough, fever. Rule out pneumonia.",
        "studyInstanceUID": "1.2.840.1.99.1.47.1.1740210300370.16",
        "status": "Uploaded",
        "expectedFiles": 154,
        "dicomFiles": [
            {
                "name": "image_001.dcm",
                "sopInstanceUID": "1.3.12.2.1107.5.1.4.54023.30000021041913344158400000001",
                "seriesInstanceUID": "1.3.12.2.1107.5.1.4.54023.30000021041913344158400000000",
                "seriesNumber": 2,
                "instanceNumber": 1,
                "seriesDescription": "Thorax Routine",
                "modality": "CT",
                "sliceThickness": 1.5,
                "path": "series_2/image_001.dcm"
            }
            // ... additional files
        ],
        "attachments": [],
        "createdAt": "2026-04-24T07:21:43.421Z"
    }
}
```

---

### 3.3 Sync Finalized Report (Upload)
Used by 5C Network to automatically push a finalized radiology report (PDF/DOCX) back into the system. Successfully calling this endpoint will transition the case status to `QA_Audit` on our platform.

- **URL:** `/api/v1/external/cases/{caseId}/report`
- **Method:** `PUT`
- **Required Scope:** `write:reports`
- **Content-Type:** `multipart/form-data`

**Requirements:**
- The case must currently be in an open/processing state (`Uploaded`, `QA_Pending`, `Assigned`, or `In_Progress`). If the case is already `Finalized` or `Rejected`, the API will return a `400 Bad Request`.

**Form Data Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reportFile` | File | Yes* | The finalized PDF or Word document report. |
| `findings` | Text | No | Raw text of the report findings. |
| `impression` | Text | No | Raw text of the report impression/conclusion. |

*\* Note: At least one of `reportFile`, `findings`, or `impression` MUST be provided.*

**Example Request:**
```bash
curl -X PUT "https://api.armorray.com/api/v1/external/cases/69eb1a07ff46a208cf8914cf/report" \
     -H "armorray-api-key: ak_5cnetwor_your_key_here" \
     -F "reportFile=@/path/to/final_report.pdf" \
     -F "impression=No significant abnormalities detected."
```

**Example Success Response:**
```json
{
    "success": true,
    "message": "Report received successfully",
    "data": {
        "caseId": "69eb1a07ff46a208cf8914cf",
        "newStatus": "QA_Audit",
        "reportStatus": "Submitted",
        "reportPath": "/uploads/cases/1.2.840.../reports/external_171000000_final_report.pdf"
    }
}
```

---

## 4. HTTP Status Codes
The API uses standard HTTP status codes to indicate success or failure.

| Code | Status | Description |
|------|--------|-------------|
| `200` | OK | The request was successful. |
| `400` | Bad Request | Missing required parameters or invalid case status for report upload. |
| `401` | Unauthorized | Missing, invalid, revoked, or expired API Key. |
| `403` | Forbidden | API Key lacks required scopes or request IP is not whitelisted. |
| `404` | Not Found | The requested Patient ID or Case ID does not exist. |
| `429` | Too Many Requests | Rate limit exceeded. Back off and try again later. |
| `500` | Internal Server Error | An unexpected error occurred on the server. |
