import type { CompAttachmentListExternal } from 'src/layout/AttachmentList/config.generated';
import type { ILayout } from 'src/layout/layout';

function generateAttachmentLists({
  id,
  dataTypeIds,
  title,
}: Pick<CompAttachmentListExternal, 'dataTypeIds' | 'id'> & { title: string }): ILayout {
  return [
    { id: `${id}-header`, type: 'Header', size: 'M', textResourceBindings: { title } },
    { id, type: 'AttachmentList', dataTypeIds },
  ];
}

export const customReceipt: ILayout = [
  { id: 'r-instance', type: 'InstanceInformation' },
  { id: 'r-header', type: 'Header', textResourceBindings: { title: 'Custom kvittering' }, size: 'L' },
  {
    id: 'r-paragraph',
    type: 'Paragraph',
    textResourceBindings: { title: 'Takk for din innsending, dette er en veldig fin custom kvittering.' },
  },
  ...generateAttachmentLists({
    id: 'r-attachments-one',
    title: 'Vedlegg fra første side',
    dataTypeIds: ['fileUpload-changename'],
  }),
  ...generateAttachmentLists({ id: 'r-attachments-other', title: 'Andre vedlegg', dataTypeIds: [] }),
  ...generateAttachmentLists({ id: 'r-attachments-pdf', title: 'Bare PDF-er', dataTypeIds: ['ref-data-as-pdf'] }),
  ...generateAttachmentLists({
    id: 'r-attachments-all',
    title: 'Alle vedlegg inkludert PDF',
    dataTypeIds: ['include-all'],
  }),
];
