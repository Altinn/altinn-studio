import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { InstanceInformation } from './InstanceInformation';
import type { InstanceInformationProps } from './InstanceInformation';

export const INSTANCE_INFORMATION_PROP_CATEGORIES = {
  title: 'text',
  description: 'text',
  help: 'text',
  componentId: 'content',
  labelGrid: 'content',
  innerGrid: 'content',
  summaryDataObject: 'runtime',
} satisfies PropCategories<InstanceInformationProps>;

const exampleSummary = {
  'Dato sendt': { value: '23.07.2026 10:32', hideFromVisualTesting: true },
  Avsender: { value: '12345678901-Ola Nordmann' },
  Mottaker: { value: 'Digdir' },
  Referansenummer: { value: 'a1b2c3d4', hideFromVisualTesting: true },
};

const meta = {
  title: 'LayoutComponents/InstanceInformation',
  component: InstanceInformation,
  excludeStories: ['INSTANCE_INFORMATION_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  args: {
    componentId: 'instance-information-preview',
    title: 'Informasjon om innsendingen',
    summaryDataObject: exampleSummary,
  },
} satisfies Meta<typeof InstanceInformation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithDescriptionAndHelp: Story = {
  args: {
    description: 'Disse opplysningene er hentet fra innsendingen.',
    help: 'Referansenummeret kan brukes hvis du kontakter etaten.',
  },
};

export const WithoutTitle: Story = {
  args: {
    title: undefined,
  },
};
