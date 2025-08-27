import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCard } from './index';

const meta: Meta<typeof StudioCard> = {
  title: 'Components/StudioCard',
  component: StudioCard,
};

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

export default meta;
