import { useDicomStore } from '@/stores/dicomStore';

/**
 * ToolbarService - Ported from OHIF
 * 
 * Manages the state and definition of toolbar buttons.
 */

export interface ToolbarButton {
    id: string;
    type: 'action' | 'toggle' | 'list';
    props: {
        icon: string;
        label: string;
        commandName?: string;
        commandOptions?: any;
        [key: string]: any;
    };
}

class ToolbarService {
    private buttons: Record<string, ToolbarButton> = {};
    private activeButtons: string[] = [];

    public setButtons(buttons: ToolbarButton[]) {
        buttons.forEach(btn => {
            this.buttons[btn.id] = btn;
        });
    }

    public getButtons(): ToolbarButton[] {
        return Object.values(this.buttons);
    }

    /**
     * Execute the command associated with a button
     */
    public recordInteraction(button: ToolbarButton) {
        const { id, props } = button;
        const { commandName, commandOptions } = props;

        if (commandName) {
            this.executeCommand(commandName, commandOptions);
        }

        // Toggle logic
        if (button.type === 'toggle') {
            if (this.activeButtons.includes(id)) {
                this.activeButtons = this.activeButtons.filter(b => b !== id);
            } else {
                this.activeButtons.push(id);
            }
        }
    }

    private executeCommand(name: string, options: any) {
        console.log(`[ToolbarService] Executing Command: ${name}`, options);
        // This would typically call a CommandService
        // For now, we'll map common commands to our store actions
        const store = useDicomStore.getState();

        switch (name) {
            case 'setToolActive':
                store.setActiveTool(options.toolName);
                break;
            case 'rotateViewport':
                // store.rotateActiveViewport(90);
                break;
            case 'invertViewport':
                // store.invertActiveViewport();
                break;
            default:
                console.warn(`[ToolbarService] Command not found: ${name}`);
        }
    }

    public getIsActive(id: string): boolean {
        return this.activeButtons.includes(id);
    }
}

export const toolbarService = new ToolbarService();
