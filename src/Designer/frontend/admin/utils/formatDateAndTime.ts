// TODO: Make this a shared util?
export function formatDateAndTime(dateString: string | undefined | null) {
  if (!dateString) {
    return '-';
  }

  return new Intl.DateTimeFormat('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(new Date(dateString));
}

export const getIsoRangeFromMinutes = (rangeMinutes: number, now: Date = new Date()) => {
  const to = now.toISOString();
  const from = new Date(now.getTime() - rangeMinutes * 60 * 1000).toISOString();

  return { from, to };
};
