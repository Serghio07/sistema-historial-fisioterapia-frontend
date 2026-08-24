export const getDisplayPhone = (patient) => patient?.telefono_administrativo || patient?.telefono || null;

export const getDisplayPhoneText = (patient, fallback = 'Sin teléfono de contacto') => (
  getDisplayPhone(patient) || fallback
);

export const getResponsibleName = (patient) => {
  const responsible = patient?.telefono_fuente === 'CONTACTO' ? patient?.responsable_principal : null;
  return responsible ? [responsible.nombres, responsible.apellidos].filter(Boolean).join(' ').trim() : '';
};

export const getResponsibleRelationship = (patient) => {
  const responsible = patient?.telefono_fuente === 'CONTACTO' ? patient?.responsable_principal : null;
  return responsible?.parentesco_otro || responsible?.parentesco || '';
};

export const getResponsibleSummary = (patient) => {
  const name = getResponsibleName(patient);
  const relationship = getResponsibleRelationship(patient);
  return [name, relationship].filter(Boolean).join(' — ');
};

export const isAdministrativeContactPhone = (patient) => patient?.telefono_fuente === 'CONTACTO';
