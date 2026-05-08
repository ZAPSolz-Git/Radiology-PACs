import React, { useState, useEffect } from 'react';
import usePatientInfo from '../../hooks/usePatientInfo';
import { Icons, useModal } from '@ohif/ui-next';
import PatientInfoModal from './PatientInfoModal';

export enum PatientInfoVisibility {
  VISIBLE = 'visible',
  VISIBLE_COLLAPSED = 'visibleCollapsed',
  DISABLED = 'disabled',
  VISIBLE_READONLY = 'visibleReadOnly',
}

const formatWithEllipsis = (str, maxLength) => {
  if (str?.length > maxLength) {
    return str.substring(0, maxLength) + '...';
  }
  return str;
};

function HeaderPatientInfo({ servicesManager, appConfig }: withAppTypes) {
  const initialExpandedState =
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE ||
    appConfig.showPatientInfo === PatientInfoVisibility.VISIBLE_READONLY;
  const [expanded, setExpanded] = useState(initialExpandedState);
  const { patientInfo, isMixedPatients } = usePatientInfo();
  const { show } = useModal();

  useEffect(() => {
    if (isMixedPatients && expanded) {
      setExpanded(false);
    }
  }, [isMixedPatients, expanded]);

  const handleOnClick = () => {
    if (isMixedPatients) {
      return;
    }

    show({
      content: PatientInfoModal,
      contentProps: { patientInfo },
      title: 'Patient & Study Details',
    });

    if (appConfig.showPatientInfo !== PatientInfoVisibility.VISIBLE_READONLY) {
      setExpanded(!expanded);
    }
  };

  const formattedPatientName = formatWithEllipsis(patientInfo.PatientName, 27);
  const formattedPatientID = formatWithEllipsis(patientInfo.PatientID, 15);

  return (
    <div
      className="bg-white/[0.04] border border-white/10 hover:bg-primary/10 flex cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-1 transition-all hover:border-primary/20 shadow-inner"
      onClick={handleOnClick}
    >
      {isMixedPatients ? (
        <Icons.MultiplePatients className="text-primary w-4 h-4" />
      ) : (
        <Icons.Patient className="text-primary w-4 h-4" />
      )}
      <div className="flex flex-col justify-center">
        {expanded ? (
          <>
            <div className="self-start text-[12px] font-bold text-foreground">
              {formattedPatientName}
            </div>
            <div className="text-primary/70 flex gap-2 text-[10px] font-medium tracking-tight">
              <div>{formattedPatientID}</div>
              <div>{patientInfo.PatientSex}</div>
              <div>{patientInfo.PatientDOB}</div>
            </div>
          </>
        ) : (
          <div className="text-primary self-center text-[12px] font-medium transition-all hover:tracking-wide">
            {isMixedPatients ? 'Multiple Patients' : 'Patient Info'}
          </div>
        )}
      </div>
      <Icons.ArrowLeft className={`text-primary h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </div>
  );
}

export default HeaderPatientInfo;
