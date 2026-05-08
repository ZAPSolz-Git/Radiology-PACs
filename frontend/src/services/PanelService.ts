import { useDicomStore } from '@/stores/dicomStore';

/**
 * PanelService - Ported from OHIF
 * 
 * Manages the content and visibility of side panels.
 */

export interface PanelDefinition {
    id: string;
    iconName: string;
    iconLabel: string;
    label: string;
    component: any; // React Component
}

class PanelService {
    private panels: Record<string, PanelDefinition> = {};
    private activePanelIds: { left: string | null; right: string | null } = {
        left: 'dicom-browser',
        right: 'measurements',
    };

    public setPanels(panels: PanelDefinition[]) {
        panels.forEach(p => {
            this.panels[p.id] = p;
        });
    }

    public activatePanel(id: string, side: 'left' | 'right') {
        this.activePanelIds[side] = id;

        // Trigger store update to re-render
        const store = useDicomStore.getState();
        if (side === 'left' && !store.leftPanelOpen) store.toggleLeftPanel();
        if (side === 'right' && !store.rightPanelOpen) store.toggleRightPanel();
    }

    public getActivePanel(side: 'left' | 'right'): PanelDefinition | null {
        const id = this.activePanelIds[side];
        return id ? this.panels[id] : null;
    }

    public getPanels(): PanelDefinition[] {
        return Object.values(this.panels);
    }
}

export const panelService = new PanelService();
