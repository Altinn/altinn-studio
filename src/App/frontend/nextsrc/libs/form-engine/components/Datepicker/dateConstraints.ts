const DATEPICKER_MIN_DEFAULT = '1900-01-01';
const DATEPICKER_MAX_DEFAULT = '2100-01-01';

type DateFlag = 'today' | 'yesterday' | 'tomorrow' | 'oneYearAgo' | 'oneYearFromNow';

const flagMap: Record<DateFlag, () => Date> = {
  today: () => new Date(),
  yesterday: () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  },
  tomorrow: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  },
  oneYearAgo: () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  },
  oneYearFromNow: () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  },
};

function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDateConstraint(
  dateOrFlag: string | undefined,
  constraint: 'min' | 'max',
): string {
  if (!dateOrFlag) {
    return constraint === 'min' ? DATEPICKER_MIN_DEFAULT : DATEPICKER_MAX_DEFAULT;
  }

  const flagFn = flagMap[dateOrFlag as DateFlag];
  if (flagFn) {
    return toISODateString(flagFn());
  }

  // Must be at least yyyy-MM-dd length to be a valid date string
  if (dateOrFlag.length >= 10) {
    return dateOrFlag.slice(0, 10);
  }

  return constraint === 'min' ? DATEPICKER_MIN_DEFAULT : DATEPICKER_MAX_DEFAULT;
}
