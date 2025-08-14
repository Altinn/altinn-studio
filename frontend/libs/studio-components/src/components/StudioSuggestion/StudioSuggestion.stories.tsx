import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioSuggestion } from '.';

type Story = StoryFn<typeof StudioSuggestion>;

const meta: Meta = {
  title: 'Components/StudioSuggestion',
  component: StudioSuggestion,
};

export const Preview: Story = (args): ReactElement => (
  <StudioSuggestion {...args}>
    <SuggestionExampleList />
  </StudioSuggestion>
);

Preview.args = {
  required: true,
  tagText: 'Required',
  label: 'StudioSuggestion',
  emptyText: 'Empty',
};

function SuggestionExampleList(): ReactElement {
  return (
    <>
      <StudioSuggestion.Option label='Option 1' value='1'>
        Option 1<div style={{ color: 'gray' }}>Description of option 1</div>
      </StudioSuggestion.Option>
      <StudioSuggestion.Option value='2'>Option 2</StudioSuggestion.Option>
      <StudioSuggestion.Option value='3'>Option 3</StudioSuggestion.Option>
    </>
  );
}
export default meta;
