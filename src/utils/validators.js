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
