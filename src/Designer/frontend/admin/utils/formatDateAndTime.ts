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
