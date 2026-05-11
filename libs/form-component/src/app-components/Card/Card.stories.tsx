import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppCard } from './index';
import { Heading } from '@digdir/designsystemet-react';

const meta = {
  title: 'AppComponents/Card',
  component: AppCard,
} satisfies Meta<typeof AppCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: <h1>heading here</h1>,
    description: 'A short description that explains what this card is about.',
    footer: 'Last updated 2 days ago',
  },
};
