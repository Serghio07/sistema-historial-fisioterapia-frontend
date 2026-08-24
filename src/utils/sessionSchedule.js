const minutesOf = (value) => {
  const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
};

export const schedulesOverlap = (left, right) => {
  if (!left?.fecha || left.fecha !== right?.fecha) return false;
  const leftStart = minutesOf(left.hora_inicio);
  const leftEnd = minutesOf(left.hora_fin);
  const rightStart = minutesOf(right.hora_inicio);
  const rightEnd = minutesOf(right.hora_fin);
  if ([leftStart, leftEnd, rightStart, rightEnd].some((value) => value === null)) return false;
  return leftStart < rightEnd && rightStart < leftEnd;
};

export const findScheduleConflict = (rows = []) => {
  const selected = rows.filter((row) => row.fecha);
  for (let left = 0; left < selected.length; left += 1) {
    for (let right = left + 1; right < selected.length; right += 1) {
      if (schedulesOverlap(selected[left], selected[right])) return [selected[left], selected[right]];
    }
  }
  return null;
};
