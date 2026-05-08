export interface SystemFeature {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    category: 'communication' | 'clinical' | 'workflow' | 'system';
}

export interface TATRule {
    id: string;
    modality: string;
    priority: 'routine' | 'urgent' | 'emergency';
    limitMinutes: number;
    description: string;
}

export interface EscalationPolicy {
    id: string;
    triggerMinutes: number;
    action: 'notification' | 'reassign' | 'alert_manager';
    targetRole: string;
    channel: 'system' | 'email' | 'whatsapp';
}

export interface SystemConfig {
    features: SystemFeature[];
    tatRules: TATRule[];
    escalations: EscalationPolicy[];
    rejectionReasons: string[];
}
