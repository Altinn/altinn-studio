export const formatTimeHHmm = (dateasstring: string) =>
  new Date(dateasstring).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatDateDDMMYY = (dateasstring: string) =>
  new Date(dateasstring).toLocaleDateString('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

export const formatDateTime = (dateasstring: string) =>
  [formatDateDDMMYY(dateasstring), formatTimeHHmm(dateasstring)].join(' ');

export const addMinutesToTime = (datestring: string, minutes: number) =>
  new Date(new Date(datestring).getTime() + minutes * 60000);
