import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioDragAndDrop } from './index';
import { StudioParagraph } from '../StudioParagraph';

type Story = StoryFn<typeof StudioDragAndDrop>;

export const Preview: Story = (): React.ReactElement => (
  <StudioDragAndDrop.Provider onAdd={() => {}} onMove={() => {}} rootId='1'>
    <StudioDragAndDrop.List>
      <StudioDragAndDrop.ListItem
        itemId='2'
        renderItem={() => (
          <StudioParagraph data-size='sm'>Preview is not available in Storybook.</StudioParagraph>
        )}
      />
    </StudioDragAndDrop.List>
  </StudioDragAndDrop.Provider>
);

const meta: Meta = {
  title: 'Components/StudioDragAndDrop',
  component: Preview,
  argTypes: {},
};

Preview.args = {};

export default meta;
