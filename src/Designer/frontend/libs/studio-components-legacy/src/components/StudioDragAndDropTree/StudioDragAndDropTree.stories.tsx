import React, { type ReactNode } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioDragAndDropTree } from './index';

type Story = StoryFn<typeof StudioDragAndDropTree>;

export const Preview: Story = (): React.ReactElement => (
  <StudioDragAndDropTree.Provider onAdd={() => {}} onMove={() => {}} rootId='1'>
    <StudioDragAndDropTree.Root>
      <StudioDragAndDropTree.Item
        emptyMessage='Preview is not available in Storybook.'
        expandable={true}
        label='Label'
        labelWrapper={(children: ReactNode) => <div>{children}</div>}
        nodeId='Id'
      />
    </StudioDragAndDropTree.Root>
  </StudioDragAndDropTree.Provider>
);

const meta: Meta = {
  title: 'Components/StudioDragAndDropTree',
  component: Preview,
  argTypes: {},
};

Preview.args = {};

export default meta;
