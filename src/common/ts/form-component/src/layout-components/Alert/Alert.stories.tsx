import type { PropCategories } from '@app/form-component/layout-components/common/storybook';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Alert } from './Alert';
import type { AlertProps } from './Alert';

export const ALERT_PROP_CATEGORIES = {
  // Text resources — Studio "Tekst" section
  title: 'text',
  body: 'text',
  // Configurable options — Studio "Innhold" section
  componentId: 'content',
  severity: 'content',
  innerGrid: 'content',
  // Runtime — injected by wrapper
  useAsAlert: 'runtime',
  ariaLabel: 'runtime',
} satisfies PropCategories<AlertProps>;

const meta = {
  title: 'LayoutComponents/Alert',
  component: Alert,
  excludeStories: ['ALERT_PROP_CATEGORIES'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    severity: {
      control: 'radio',
      options: ['success', 'warning', 'danger', 'info'],
    },
  },
  args: {
    componentId: 'alert-preview',
    severity: 'info',
    title: 'Viktig informasjon',
    body: 'Du må fylle ut alle obligatoriske felt før du kan sende inn skjemaet.',
  },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = {
  args: {
    severity: 'success',
    title: 'Skjemaet er sendt inn',
    body: 'Vi har mottatt opplysningene dine.',
  },
};

export const Warning: Story = {
  args: {
    severity: 'warning',
    title: 'Vær oppmerksom',
    body: 'Enkelte opplysninger mangler og bør fylles ut.',
  },
};

export const Danger: Story = {
  args: {
    severity: 'danger',
    title: 'Noe gikk galt',
    body: 'Vi klarte ikke å lagre endringene dine. Prøv igjen senere.',
  },
};
