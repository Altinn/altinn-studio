import type { ILayout } from 'src/layout/layout';

export const customReceipt: ILayout = [
  { id: 'r-instance', type: 'InstanceInformation' },
  { id: 'r-header', type: 'Header', textResourceBindings: { title: 'Custom kvittering' }, size: 'L' },
  {
    id: 'r-paragraph',
    type: 'Paragraph',
    textResourceBindings: { title: 'Takk for din innsending, dette er en veldig fin custom kvittering.' },
  },
  { id: 'r-attachments', type: 'AttachmentList', dataTypeIds: ['ref-data-as-pdf'], includePDF: true },
];
