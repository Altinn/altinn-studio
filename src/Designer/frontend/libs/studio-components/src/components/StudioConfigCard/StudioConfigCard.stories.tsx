import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioConfigCard } from './';
import { action } from 'storybook/internal/actions';

type StoryArgs = {
  cardLabel: string;
  bodyContent: React.ReactNode;
  saveLabel: string;
  cancelLabel: string;
};

const meta: Meta = {
  title: 'Components/StudioConfigCard',
  component: StudioConfigCard,
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Preview: Story = {
  args: {
    cardLabel: 'Cards Label',
    bodyContent: 'Duis diam dui, pellentesque et.',
    saveLabel: 'Save me',
    cancelLabel: 'Cancel me',
  },
  render: (args) => (
    <StudioConfigCard>
      <StudioConfigCard.Header
        cardLabel={args.cardLabel}
        onDelete={action('delete')}
        deleteAriaLabel='Delete me'
        confirmMessage='Are you sure you want to delete me?'
      />
      <StudioConfigCard.Body>{args.bodyContent}</StudioConfigCard.Body>
      <StudioConfigCard.Footer
        saveLabel={args.saveLabel}
        cancelLabel={args.cancelLabel}
        onCancel={action('cancel')}
        onSave={action('save')}
      />
    </StudioConfigCard>
  ),
  argTypes: {
    cardLabel: { control: 'text' },
    bodyContent: { control: 'text' },
    saveLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
  },
};
