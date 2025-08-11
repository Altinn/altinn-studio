import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioSuggestion, StudioSuggestionOption } from '.';

type Story = StoryFn<typeof StudioSuggestion>;

const meta: Meta = {
  title: 'Components/StudioSuggestion',
  component: StudioSuggestion,
  args: {},
  argTypes: {
    'data-size': {
      options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};
export const Preview: Story = (args): ReactElement => (
  <StudioSuggestion {...args}>
    <SuggestionExampleList />
  </StudioSuggestion>
);

Preview.args = {
  required: true,
  tagText: 'Required',
  legend: 'StudioSuggestion',
  description: <div>Description</div>,
  emptyText: 'Empty',
  'data-size': 'sm',
};

function SuggestionExampleList(): ReactElement {
  return (
    <>
      <StudioSuggestionOption label='Option 1' value='1'>
        Option 1<div style={{ color: 'gray' }}>Description of option 1</div>
      </StudioSuggestionOption>
      <StudioSuggestionOption value='2'>Option 2</StudioSuggestionOption>
      <StudioSuggestionOption value='3'>Option 3</StudioSuggestionOption>
    </>
  );
}
export default meta;
