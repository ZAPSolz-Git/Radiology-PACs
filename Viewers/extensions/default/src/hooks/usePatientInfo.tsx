import { useState, useEffect } from 'react';
import { utils, useSystem } from '@ohif/core';

const { formatPN, formatDate } = utils;

function usePatientInfo() {
  const { servicesManager } = useSystem();
  const { displaySetService } = servicesManager.services;

  const [patientInfo, setPatientInfo] = useState({
    PatientName: '',
    PatientID: '',
    PatientSex: '',
    PatientDOB: '',
    PatientAge: '',
    PatientWeight: '',
    StudyDate: '',
    StudyTime: '',
    AccessionNumber: '',
    StudyDescription: '',
    ReferringPhysicianName: '',
    InstitutionName: '',
    Modality: '',
    Manufacturer: '',
  });
  const [isMixedPatients, setIsMixedPatients] = useState(false);

  const checkMixedPatients = (PatientID: string) => {
    const displaySets = displaySetService.getActiveDisplaySets();
    let isMixedPatients = false;
    displaySets.forEach(displaySet => {
      const instance = displaySet?.instances?.[0] || displaySet?.instance;
      if (!instance) {
        return;
      }
      if (instance.PatientID !== PatientID) {
        isMixedPatients = true;
      }
    });
    setIsMixedPatients(isMixedPatients);
  };

  const updatePatientInfo = (props: any) => {
    const displaySetsAdded = props?.displaySetsAdded || [];
    if (!displaySetsAdded.length) {
      return;
    }
    const displaySet = displaySetsAdded[0];
    const instance = displaySet?.instances?.[0] || displaySet?.instance;
    if (!instance) {
      return;
    }

    setPatientInfo({
      PatientID: instance.PatientID || null,
      PatientName: instance.PatientName ? formatPN(instance.PatientName) : null,
      PatientSex: instance.PatientSex || null,
      PatientDOB: formatDate(instance.PatientBirthDate) || null,
      PatientAge: instance.PatientAge || null,
      PatientWeight: instance.PatientWeight || null,
      StudyDate: formatDate(instance.StudyDate) || null,
      StudyTime: instance.StudyTime || null,
      AccessionNumber: instance.AccessionNumber || null,
      StudyDescription: instance.StudyDescription || null,
      ReferringPhysicianName: instance.ReferringPhysicianName
        ? formatPN(instance.ReferringPhysicianName)
        : null,
      InstitutionName: instance.InstitutionName || null,
      Modality: instance.Modality || null,
      Manufacturer: instance.Manufacturer || null,
    });
    checkMixedPatients(instance.PatientID || null);
  };

  useEffect(() => {
    const subscription = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      props => updatePatientInfo(props)
    );
    return () => subscription.unsubscribe();
  }, []);

  return { patientInfo, isMixedPatients };
}

export default usePatientInfo;
