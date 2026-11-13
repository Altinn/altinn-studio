import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCard } from './';

const meta = {
  title: 'Components/StudioCard',
  component: StudioCard,
} satisfies Meta<typeof StudioCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  args: {
    children: 'Lorem ipsum dolor sit amet.',
  },
};

export const WithBlocks: Story = {
  args: {
    children: (
      <>
        <StudioCard.Block>Duis diam dui, pellentesque et.</StudioCard.Block>
        <StudioCard.Block>Aliquam et lectus at ante.</StudioCard.Block>
      </>
    ),
  },
};
