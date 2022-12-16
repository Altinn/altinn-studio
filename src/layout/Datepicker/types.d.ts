import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompDatepicker extends ILayoutCompBase<'Datepicker'> {
  minDate?: string | 'today';
  maxDate?: string | 'today';
  timeStamp?: boolean;
  format?: string;
}
