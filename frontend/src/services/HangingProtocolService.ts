import { useDicomStore } from '@/stores/dicomStore';
import { displaySetService } from './DisplaySetService';

/**
 * HangingProtocolService - Simplified Port from OHIF
 * 
 * Determines which display sets go into which viewports.
 */
interface Protocol {
    id: string;
    name: string;
    stages: {
        viewportStructure: {
            type: 'grid';
            properties: { rows: number; columns: number };
        };
        viewports: {
            viewportOptions: {
                viewportType: string;
                toolGroupId: string;
            };
            displaySetOptions: {
                matchingCriteria: {
                    name: string;
                    weight: number;
                    value: any;
                    constraint: 'equals' | 'startsWith' | 'contains';
                }[];
            };
        }[];
    }[];
}

class HangingProtocolService {
    private protocols: Record<string, Protocol> = {};
    private activeProtocolId: string = 'default';

    constructor() {
        this.initDefaultProtocols();
    }

    private initDefaultProtocols() {
        this.protocols['default'] = {
            id: 'default',
            name: 'Default Protocol',
            stages: [{
                viewportStructure: {
                    type: 'grid',
                    properties: { rows: 1, columns: 1 }
                },
                viewports: [{
                    viewportOptions: { viewportType: 'stack', toolGroupId: 'default' },
                    displaySetOptions: { matchingCriteria: [] }
                }]
            }]
        };
    }

    /**
   * Run the protocol matching for a study
   * Returns a configuration object for dicomStore.applyHangingProtocol
   */
    public run(studyInstanceUID: string, protocolId: string = 'default'): any {
        const protocol = this.protocols[protocolId] || this.protocols['default'];
        const stage = protocol.stages[0]; // Simple: only first stage
        const displaySets = displaySetService.getDisplaySetsForStudy(studyInstanceUID);

        if (!displaySets.length) return null;

        const rows = stage.viewportStructure.properties.rows;
        const cols = stage.viewportStructure.properties.columns;
        const numViewports = rows * cols;

        const viewportConfigs = [];

        // Map Display Sets to Viewports
        for (let i = 0; i < numViewports; i++) {
            // Find best match or just take the next display set
            const ds = displaySets[i % displaySets.length];

            viewportConfigs.push({
                displaySetInstanceUID: ds.displaySetInstanceUID,
                initialOptions: {
                    viewportType: stage.viewports[0]?.viewportOptions.viewportType || 'stack'
                }
            });
        }

        return {
            rows,
            cols,
            viewports: viewportConfigs
        };
    }

    public addProtocol(protocol: Protocol) {
        this.protocols[protocol.id] = protocol;
    }
}

export const hangingProtocolService = new HangingProtocolService();
