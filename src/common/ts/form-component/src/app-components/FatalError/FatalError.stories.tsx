import type { Meta, StoryObj } from '@storybook/react-vite';

import { FatalError } from './FatalError';
import { FatalErrorEmpty } from './FatalErrorEmpty';

const meta = {
  title: 'AppComponents/FatalError',
  component: FatalError,
} satisfies Meta<typeof FatalError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'An unrecoverable error has occurred.',
  },
};

export const Empty: StoryObj<typeof FatalErrorEmpty> = {
  render: () => <FatalErrorEmpty />,
  parameters: {
    docs: {
      description: {
        story: 'Renders a hidden marker element signalling a fatal error without visible content.',
      },
    },
  },
};
