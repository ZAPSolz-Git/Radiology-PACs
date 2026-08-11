import React from 'react';
import { useTranslation } from 'react-i18next';

interface PatientInfoModalProps {
  patientInfo: any;
}

const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex border-b border-white/5 py-2 last:border-0">
    <div className="w-1/3 text-[13px] font-medium text-white/50">{label}</div>
    <div className="w-2/3 text-[13px] text-white">{value || 'N/A'}</div>
  </div>
);

const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-6 last:mb-0">
    <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
      {title}
    </div>
    <div className="rounded-lg bg-black/20 p-3">
      {children}
    </div>
  </div>
);

export default function PatientInfoModal({ patientInfo }: PatientInfoModalProps) {
  const { t } = useTranslation();

  return (
    <div className="max-h-[70vh] overflow-y-auto px-4 py-2 custom-scrollbar">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}
      </style>
      <InfoSection title="Patient Details">
        <InfoRow label="Name" value={patientInfo.PatientName} />
        <InfoRow label="Patient ID" value={patientInfo.PatientID} />
        <InfoRow label="Sex" value={patientInfo.PatientSex} />
        <InfoRow label="DOB" value={patientInfo.PatientDOB} />
        <InfoRow label="Age" value={patientInfo.PatientAge} />
        <InfoRow label="Weight" value={patientInfo.PatientWeight ? `${patientInfo.PatientWeight} kg` : null} />
      </InfoSection>

      <InfoSection title="Study Details">
        <InfoRow label="Study Date" value={patientInfo.StudyDate} />
        <InfoRow label="Study Time" value={patientInfo.StudyTime} />
        <InfoRow label="Accession #" value={patientInfo.AccessionNumber} />
        <InfoRow label="Description" value={patientInfo.StudyDescription} />
        <InfoRow label="Referring Phys." value={patientInfo.ReferringPhysicianName} />
        <InfoRow label="Institution" value={patientInfo.InstitutionName} />
      </InfoSection>

      <InfoSection title="Technical Details">
        <InfoRow label="Modality" value={patientInfo.Modality} />
        <InfoRow label="Manufacturer" value={patientInfo.Manufacturer} />
      </InfoSection>
    </div>
  );
}
