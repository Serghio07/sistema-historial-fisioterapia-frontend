export const cleanPayload = (value) => {
  if (Array.isArray(value)) return value.map(cleanPayload);
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((data, [key, entry]) => {
      if (['id', 'created_at', 'updated_at', 'paciente', 'usuario'].includes(key)) return data;
      data[key] = cleanPayload(entry);
      return data;
    }, {});
  }

  return value === '' ? null : value;
};

export const required = (value) => value !== undefined && value !== null && value !== '';

export const nombrePaciente = (paciente) => {
  if (!paciente) return 'Paciente no disponible';
  return `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim();
};

export const formatPatientDocument = (paciente) => {
  if (!paciente) return '';
  const numero = String(paciente.numero_documento || paciente.ci || '').trim();
  if (!numero) return '';
  const tipo = String(paciente.tipo_documento || 'CI').trim().toLocaleUpperCase('es-BO');
  const etiqueta = tipo === 'OTRO'
    ? String(paciente.nombre_documento_otro || 'OTRO').trim().toLocaleUpperCase('es-BO')
    : tipo;
  return `${etiqueta} ${numero}`;
};

export const patientDocumentSearchText = (paciente) => [
  paciente?.numero_documento,
  paciente?.numero_documento_normalizado,
  paciente?.ci,
  paciente?.tipo_documento,
  paciente?.nombre_documento_otro
].filter(Boolean).join(' ');
