import { ToolGroupManager, Enums } from '@cornerstonejs/tools';

/**
 * ToolGroupService - Ported from OHIF
 * 
 * Manages tool groups and their respective tools/bindings.
 */

export interface ToolConfig {
    toolName: string;
    bindings?: any[];
    configuration?: Record<string, any>;
}

export interface ToolGroupDefinition {
    active?: ToolConfig[];
    passive?: ToolConfig[];
    enabled?: ToolConfig[];
    disabled?: ToolConfig[];
}

export class ToolGroupService {
    private toolGroupIds: Set<string> = new Set();
    public readonly defaultToolGroupId = 'default_tool_group';

    public getToolGroup(toolGroupId: string = this.defaultToolGroupId) {
        return ToolGroupManager.getToolGroup(toolGroupId);
    }

    public createToolGroup(toolGroupId: string): any {
        if (this.toolGroupIds.has(toolGroupId)) {
            return ToolGroupManager.getToolGroup(toolGroupId);
        }
        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        this.toolGroupIds.add(toolGroupId);
        return toolGroup;
    }

    public addViewportToToolGroup(viewportId: string, renderingEngineId: string, toolGroupId: string = this.defaultToolGroupId) {
        let toolGroup = this.getToolGroup(toolGroupId);
        if (!toolGroup) {
            toolGroup = this.createToolGroup(toolGroupId);
        }
        toolGroup.addViewport(viewportId, renderingEngineId);
    }

    public initToolGroupWithTools(toolGroupId: string, definition: ToolGroupDefinition) {
        const toolGroup = this.createToolGroup(toolGroupId);

        // Helper to add and set mode
        const applyTools = (tools: ToolConfig[] | undefined, mode: 'Active' | 'Passive' | 'Enabled' | 'Disabled') => {
            if (!tools) return;
            tools.forEach(({ toolName, configuration, bindings }) => {
                toolGroup.addTool(toolName, configuration || {});
                if (mode === 'Active') {
                    toolGroup.setToolActive(toolName, { bindings });
                } else if (mode === 'Passive') {
                    toolGroup.setToolPassive(toolName);
                } else if (mode === 'Enabled') {
                    toolGroup.setToolEnabled(toolName);
                } else if (mode === 'Disabled') {
                    toolGroup.setToolDisabled(toolName);
                }
            });
        };

        applyTools(definition.active, 'Active');
        applyTools(definition.passive, 'Passive');
        applyTools(definition.enabled, 'Enabled');
        applyTools(definition.disabled, 'Disabled');
    }

    public destroy() {
        ToolGroupManager.destroy();
        this.toolGroupIds.clear();
    }
}

export const toolGroupService = new ToolGroupService();
