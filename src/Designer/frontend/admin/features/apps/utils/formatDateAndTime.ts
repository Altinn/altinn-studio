// TODO: Make this a shared util?
export function formatDateAndTime(dateString: string | undefined | null) {
  if (!dateString) {
    return '-';
  }

  // Engine and Storage timestamps are trusted but not guaranteed: a value that does not parse is
  // shown as it came rather than thrown, so one odd timestamp cannot take a whole view down.
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat('no-NB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(date);
}
