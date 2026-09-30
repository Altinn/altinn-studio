import type { Meta, StoryObj } from '@storybook/react-vite';

import { HelpTextContainer } from './HelpTextContainer';

const meta = {
  title: 'LayoutComponents/Common/HelpTextContainer',
  component: HelpTextContainer,
  parameters: {
    layout: 'centered',
  },
  args: {
    id: 'example',
    helpText: 'Dette er en hjelpetekst som forklarer hva du skal gjøre.',
  },
} satisfies Meta<typeof HelpTextContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const WithTitle: Story = {
  args: {
    title: 'Fødselsdato',
  },
};
