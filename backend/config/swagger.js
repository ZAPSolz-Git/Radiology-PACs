import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Armorray Project API',
            version: '2.6.1',
            description: `
## Welcome to the Armorray API Documentation
This is the comprehensive API for the **Armorray Radiology Information System (RIS)**. 
It provides endpoints for:
*   **Case Management**: Create, update, and track radiology cases.
*   **Workflow Integration**: QA, Reporting, and Radiologist assignments.
*   **Financials**: Billing, Invoices, and Payouts.
*   **Infrastructure**: PACS integration (DICOM), Backups, and Analytics.

### Authentication
Most endpoints require a **Bearer Token** (JWT). Use the \`Auth\` section to login and obtain a token.
            `,
            contact: {
                name: 'Armorray Dev Team',
                url: 'https://armorray.com',
                email: 'info@armorray.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
                description: 'Development server',
            },
        ],

        tags: [
            { name: 'Auth', description: 'User registration, login, and token management' },
            { name: 'Cases', description: 'Radiology case lifecycle and study management' },
            { name: 'Patients', description: 'Patient demographic data and records' },
            { name: 'QA', description: 'Quality Assurance workflow and case review' },
            { name: 'Radiologist', description: 'Radiologist-specific workflows and reporting' },
            { name: 'Reporting', description: 'Medical report generation and management' },
            { name: 'PACS', description: 'DICOM connectivity and study import/export' },
            { name: 'Billing', description: 'Financial transactions, tariffs, and invoices' },
            { name: 'Analytics', description: 'System performance and data visualization' },
            { name: 'ShareLink', description: 'Secure external study sharing tokens' },
            { name: 'Infrastructure', description: 'Backups, banners, and internal system tools' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    description: 'System user profile containing authentication and role information.',
                    properties: {
                        id: { type: 'string', description: 'Unique MongoDB identifier', example: '60d0fe4f5311236168a109ca' },
                        name: { type: 'string', description: 'Full name of the user', example: 'John Doe' },
                        email: { type: 'string', format: 'email', description: 'Primary contact and login email', example: 'john@example.com' },
                        role: {
                            type: 'string',
                            enum: ['technician', 'qa', 'radiologist', 'admin'],
                            description: 'Permission level defining available features and data access.',
                            example: 'technician'
                        },
                        createdAt: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
                        updatedAt: { type: 'string', format: 'date-time', description: 'Last profile update timestamp' },
                    },
                },
                Patient: {
                    type: 'object',
                    description: 'Detailed patient information linked to radiology cases.',
                    properties: {
                        id: { type: 'string', description: 'Unique internal identifier' },
                        name: { type: 'string', description: 'Full legal name of the patient', example: 'Jane Doe' },
                        patientId: { type: 'string', description: 'Hospital MRN or external system ID', example: 'MRN12345' },
                        age: { type: 'number', minimum: 0, description: 'Age at time of registration', example: 45 },
                        gender: { type: 'string', enum: ['M', 'F', 'O'], description: 'Biological gender (Male, Female, Other)', example: 'F' },
                        phone: { type: 'string', description: 'Primary contact number' },
                        email: { type: 'string', format: 'email', description: 'Patient contact email' },
                    }
                },
                Case: {
                    type: 'object',
                    description: 'Core radiology case record representing a diagnostic study.',
                    properties: {
                        id: { type: 'string', description: 'Unique case identifier' },
                        patientName: { type: 'string', description: 'De-identified or full name' },
                        patientId: { type: 'string', description: 'Linked patient identifier' },
                        modality: { type: 'string', description: 'Imaging method (CT, MRI, XR, etc.)', example: 'CT' },
                        bodyPart: { type: 'string', description: 'Anatomical region examined', example: 'Brain' },
                        status: {
                            type: 'string',
                            description: 'Workflow state (e.g., Uploaded, Assigned, Reported)',
                            example: 'Uploaded'
                        },
                        urgency: { type: 'string', enum: ['Routine', 'Urgent', 'Stat'], example: 'Routine' },
                        isEmergency: { type: 'boolean', description: 'High-priority flag for critical care', default: false },
                        createdAt: { type: 'string', format: 'date-time', description: 'Study arrival timestamp' },
                    }
                },
                Site: {
                    type: 'object',
                    description: 'PACS destination or source site configuration.',
                    properties: {
                        id: { type: 'string', description: 'Internal site identifier' },
                        name: { type: 'string', description: 'Display name of the hospital or clinic', example: 'Central Imaging Center' },
                        siteId: { type: 'string', description: 'Unique alphanumeric site code', example: 'CEN001' },
                        scpAETitle: { type: 'string', description: 'DICOM AE Title for receiving studies' },
                        scpIP: { type: 'string', description: 'IP address of the remote PACS server' },
                        scpPort: { type: 'number', description: 'DICOM communication port (usually 104 or 11112)' },
                        isActive: { type: 'boolean', description: 'Whether this connection is currently enabled', default: true }
                    }
                },
                Macro: {
                    type: 'object',
                    description: 'Shortcuts for rapid report dictation/typing.',
                    properties: {
                        id: { type: 'string' },
                        key: { type: 'string', description: 'The trigger phrase (e.g., /heart)', example: '/heart' },
                        expansion: { type: 'string', description: 'The full text to replace the trigger with.', example: 'The cardiac size and pulmonary vascularity are within normal limits.' }
                    }
                },
                Template: {
                    type: 'object',
                    description: 'Standardized report structures for specific modalities or body parts.',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string', example: 'Normal Brain CT' },
                        content: { type: 'string', description: 'The boilerplate text for the report' },
                        modality: { type: 'string', example: 'CT' },
                        bodyPart: { type: 'string', example: 'Brain' },
                        isPublic: { type: 'boolean', description: 'Visible to all radiologists if true' }
                    }
                },
                Invoice: {
                    type: 'object',
                    description: 'Billing record for services rendered to an institution.',
                    properties: {
                        invoiceId: { type: 'string', example: 'INV-2026-001' },
                        institutionName: { type: 'string', example: 'City Hospital' },
                        amount: { type: 'number', description: 'Total amount in local currency' },
                        status: { type: 'string', enum: ['pending', 'paid', 'partial'], example: 'pending' },
                        dueDate: { type: 'string', format: 'date-time' }
                    }
                },
                Payout: {
                    type: 'object',
                    description: 'Earnings record for a radiologist or technician.',
                    properties: {
                        id: { type: 'string' },
                        period: { type: 'string', description: 'Month and year of payout', example: '03-2026' },
                        amount: { type: 'number', description: 'Net earnings' },
                        status: { type: 'string', enum: ['Pending', 'Paid'], example: 'Paid' }
                    }
                },
                Backup: {
                    type: 'object',
                    description: 'Record of a system database or file backup.',
                    properties: {
                        backupId: { type: 'string' },
                        type: { type: 'string', enum: ['automatic', 'manual'], example: 'automatic' },
                        status: { type: 'string', enum: ['success', 'failed', 'in-progress'], example: 'success' },
                        size: { type: 'string', description: 'File size in MB/GB', example: '1.2 GB' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        token: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' }
                    }
                },
                AuditLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        category: { type: 'string', enum: ['AUTH', 'USER_MGMT', 'CASE_WORKFLOW', 'SECURITY_CONFIG', 'DATA_ACCESS', 'FINANCIAL', 'SYSTEM'] },
                        action: { type: 'string' },
                        user: { type: 'string', description: 'User ID' },
                        status: { type: 'string', enum: ['Success', 'Failure', 'Warning', 'Info', 'Critical'] },
                        severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
                        timestamp: { type: 'string', format: 'date-time' }
                    }
                },
                Banner: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        imageUrl: { type: 'string' },
                        description: { type: 'string' },
                        isActive: { type: 'boolean' }
                    }
                },
                Message: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        caseId: { type: 'string' },
                        senderId: { type: 'string' },
                        senderName: { type: 'string' },
                        senderRole: { type: 'string' },
                        text: { type: 'string' },
                        messageType: { type: 'string', enum: ['text', 'image', 'file', 'system'] },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        recipientId: { type: 'string' },
                        type: { type: 'string', enum: ['chat', 'case'] },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        relatedId: { type: 'string' },
                        isRead: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                SecuritySetting: {
                    type: 'object',
                    properties: {
                        enforce2FA: { type: 'boolean' },
                        passwordRotationDays: { type: 'number' },
                        sessionTimeoutMinutes: { type: 'number' },
                        maxFailedAttempts: { type: 'number' },
                        lockoutDurationMinutes: { type: 'number' }
                    }
                },
                Tariff: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        modality: { type: 'string', enum: ["CT", "MRI", "X-Ray", "US", "PET-CT", "MG", "BMD", "OTHERS"] },
                        studyType: { type: 'string' },
                        basePrice: { type: 'number' },
                        emergencySurcharge: { type: 'number' },
                        nightHolidaySurcharge: { type: 'number' },
                        isActive: { type: 'boolean' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error message' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
                ShareLink: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        caseId: { type: 'string' },
                        studyInstanceUID: { type: 'string' },
                        role: { type: 'string', enum: ['radiologist', 'technician', 'qa', 'user'] },
                        createdBy: { type: 'string' },
                        expiresAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        isRevoked: { type: 'boolean' },
                        shareUrl: { type: 'string' }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' }
                    }
                },
                MessageResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation completed successfully' }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/Error' } }
                    }
                },
                ForbiddenError: {
                    description: 'User does not have permission for this action',
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/Error' } }
                    }
                },
                NotFoundError: {
                    description: 'The requested resource was not found',
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/Error' } }
                    }
                },
                BadRequestError: {
                    description: 'The request was invalid or missing required fields',
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/Error' } }
                    }
                },
                InternalError: {
                    description: 'An internal server error occurred',
                    content: {
                        'application/json': { schema: { $ref: '#/components/schemas/Error' } }
                    }
                }
            }
        },
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
