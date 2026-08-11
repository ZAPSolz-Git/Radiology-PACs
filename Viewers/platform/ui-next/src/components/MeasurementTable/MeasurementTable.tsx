import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icons, PanelSection, Tooltip, TooltipContent, TooltipTrigger } from '../../index';
import DataRow from '../DataRow/DataRow';
import { createContext } from '../../lib/createContext';

interface MeasurementTableContext {
  data?: any[];
  onAction?: (e, command: string | string[], uid: string) => void;
  disableEditing?: boolean;
  isExpanded: boolean;
}

const [MeasurementTableProvider, useMeasurementTableContext] =
  createContext<MeasurementTableContext>('MeasurementTable', { data: [], isExpanded: true });

interface MeasurementDataProps extends MeasurementTableContext {
  title: string;
  children: React.ReactNode;
}

const MeasurementTable = ({
  data = [],
  onAction,
  isExpanded = true,
  title,
  children,
  disableEditing = false,
}: MeasurementDataProps) => {
  const { t } = useTranslation('MeasurementTable');
  const amount = data.length;

  return (
    <MeasurementTableProvider
      data={data}
      onAction={onAction}
      isExpanded={isExpanded}
      disableEditing={disableEditing}
    >
      <PanelSection defaultOpen={true}>
        <PanelSection.Header
          key="measurementTableHeader"
          className="bg-[#0a0f18] border-b border-primary/10"
        >
          <div className="flex items-center gap-2">
            <div className="h-4 w-0.5 rounded-full bg-primary shadow-[0_0_6px_rgba(45,212,191,0.6)]" />
            <span className="text-[13px] font-semibold tracking-wide text-foreground/90">{t(title)}</span>
            <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {amount}
            </span>
          </div>
        </PanelSection.Header>
        <PanelSection.Content key="measurementTableContent" className="bg-[#060a10] p-0">{children}</PanelSection.Content>
      </PanelSection>
    </MeasurementTableProvider>
  );
};

const Header = ({ children }: { children: React.ReactNode }) => {
  return <div className="measurement-table-header">{children}</div>;
};

const Body = () => {
  const { data } = useMeasurementTableContext('MeasurementTable.Body');

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icons.ToolLength className="h-5 w-5 text-primary/60" />
        </div>
        <p className="text-[13px] font-medium text-foreground/50">
          {useTranslation('MeasurementTable').t('No tracked measurements')}
        </p>
        <p className="mt-0.5 text-[11px] text-foreground/30">Use measurement tools to add annotations</p>
      </div>
    );
  }

  return (
    <div className="measurement-table-body space-y-1 p-1.5">
      {data.map((item, index) => (
        <Row
          key={item.uid}
          item={item}
          index={index}
        />
      ))}
    </div>
  );
};

const Footer = ({ children }: { children: React.ReactNode }) => {
  return <div className="measurement-table-footer">{children}</div>;
};

interface MeasurementItem {
  uid: string;
  label: string;
  colorHex: string;
  isSelected: boolean;
  displayText: { primary: string[]; secondary: string[] };
  isVisible: boolean;
  isLocked: boolean;
  toolName: string;
  isExpanded: boolean;
  isUnmapped?: boolean;
  statusTooltip?: string;
}

interface RowProps {
  item: MeasurementItem;
  index: number;
}

const Row = ({ item, index }: RowProps) => {
  const { onAction, isExpanded, disableEditing } =
    useMeasurementTableContext('MeasurementTable.Row');

  const { uid } = item;
  return (
    <DataRow
      key={item.uid}
      description={item.label}
      number={index + 1}
      title={item.label}
      colorHex={item.colorHex}
      isSelected={item.isSelected}
      details={item.displayText}
      onDelete={e => onAction(e, 'removeMeasurement', uid)}
      onSelect={e => onAction(e, 'jumpToMeasurement', uid)}
      onRename={e => onAction(e, 'renameMeasurement', uid)}
      onToggleVisibility={e => onAction(e, 'toggleVisibilityMeasurement', uid)}
      onToggleLocked={e => onAction(e, 'toggleLockMeasurement', uid)}
      onColor={e => onAction(e, 'changeMeasurementColor', uid)}
      disableEditing={disableEditing}
      isVisible={item.isVisible}
      isLocked={item.isLocked}
    >
      {item.isUnmapped && (
        <DataRow.Status.Warning tooltip={item.statusTooltip} />
      )}
    </DataRow>
  );
};

MeasurementTable.Header = Header;
MeasurementTable.Body = Body;
MeasurementTable.Footer = Footer;
MeasurementTable.Row = Row;

export default MeasurementTable;
