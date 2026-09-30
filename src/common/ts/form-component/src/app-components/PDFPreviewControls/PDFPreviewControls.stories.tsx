import { fn } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { PDFPreviewControls } from './PDFPreviewControls';
import type { PDFPreviewControlsProps } from './PDFPreviewControls';

const storybookGenerate: PDFPreviewControlsProps['onGenerate'] = async () => ({
  type: 'error',
  message: 'Forhåndsvisning er ikke tilgjengelig i Storybook',
});

const meta = {
  title: 'AppComponents/PDFPreviewControls',
  component: PDFPreviewControls,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    buttonStyle: {
      control: 'radio',
      options: ['primary', 'secondary'],
    },
  },
  args: {
    title: 'Forhåndsvis PDF',
    errorHeading: 'Kunne ikke vise PDF-forhåndsvisning',
    loadingLabel: 'Laster',
    buttonStyle: 'primary',
    showErrorDetails: true,
    onGenerate: fn(storybookGenerate),
  },
} satisfies Meta<typeof PDFPreviewControls>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Secondary: Story = {
  args: {
    buttonStyle: 'secondary',
  },
};

export const CustomText: Story = {
  args: {
    title: 'Generer PDF',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
