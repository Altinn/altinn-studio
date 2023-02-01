import { addMinutesToTime } from 'app-shared/pure/date-format';

export const shouldDisplayDeployStatus = (timestring: string) =>
  new Date() < addMinutesToTime(timestring, 60);
