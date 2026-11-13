import React, { type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDragAndDropTree } from './index';

const PreviewComponent = (): React.ReactElement => (
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

const meta = {
  title: 'Components/StudioDragAndDropTree',
  component: PreviewComponent,
  argTypes: {},
} satisfies Meta<typeof PreviewComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};
