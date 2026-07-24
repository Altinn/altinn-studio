import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { AttachmentList } from './AttachmentList';
import type { AttachmentListProps, DisplayAttachment } from './AttachmentList';

export const ATTACHMENT_LIST_PROP_CATEGORIES = {
  title: 'text',
  componentId: 'content',
  groupByDataTypeGrouping: 'content',
  showLinks: 'content',
  showDescription: 'content',
  innerGrid: 'content',
  attachments: 'runtime',
} satisfies PropCategories<AttachmentListProps>;

const exampleAttachments: DisplayAttachment[] = [
  {
    name: 'soknad.pdf',
    iconClass: 'reg reg-attachment',
    grouping: undefined,
    description: { nb: 'Søknadsskjema' },
    url: 'https://example.com/soknad.pdf',
    dataType: 'vedlegg',
  },
  {
    name: 'vedlegg-dokument.docx',
    iconClass: 'reg reg-attachment',
    grouping: 'Dokumentasjon',
    description: { nb: 'Tilleggsdokumentasjon' },
    url: 'https://example.com/vedlegg.docx',
    dataType: 'dokumentasjon',
  },
];

const meta = {
  title: 'LayoutComponents/AttachmentList',
  component: AttachmentList,
  excludeStories: ['ATTACHMENT_LIST_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'attachment-list-preview',
    title: 'Vedlegg',
    attachments: exampleAttachments,
    showLinks: true,
  },
} satisfies Meta<typeof AttachmentList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Grouped: Story = {
  args: {
    groupByDataTypeGrouping: true,
    attachments: [
      ...exampleAttachments,
      {
        name: 'annet.pdf',
        iconClass: 'reg reg-attachment',
        grouping: 'Dokumentasjon',
        description: undefined,
        url: 'https://example.com/annet.pdf',
        dataType: 'dokumentasjon',
      },
    ],
  },
};

export const WithDescriptions: Story = {
  args: {
    showDescription: true,
  },
};
