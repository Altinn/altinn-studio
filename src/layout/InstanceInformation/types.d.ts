import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompInstanceInformation extends ILayoutCompBase<'InstanceInformation'> {
  elements?: {
    dateSent?: boolean;
    sender?: boolean;
    receiver?: boolean;
    referenceNumber?: boolean;
  };
}
