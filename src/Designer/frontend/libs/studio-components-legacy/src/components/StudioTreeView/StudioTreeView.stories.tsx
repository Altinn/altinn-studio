import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioTreeView } from './index';

import { PencilIcon } from '../../../../studio-icons';

const PreviewComponent = (args): React.ReactElement => (
  <StudioTreeView.Root>
    <StudioTreeView.Item {...args} />
  </StudioTreeView.Root>
);

type Story = StoryFn<typeof PreviewComponent>;

const meta: Meta = {
  title: 'Components/StudioTreeView',
  component: PreviewComponent,
};
export const Preview: Story = (args): React.ReactElement => <PreviewComponent {...args} />;

Preview.args = {
  children: 'MyFile.pdf',
  label: 'Folder name',
  nodeId: '1',
};

export const WithIcon: Story = (args): React.ReactElement => <PreviewComponent {...args} />;

WithIcon.args = {
  children: 'MyFile.pdf',
  label: 'Folder name',
  nodeId: '1',
  icon: <PencilIcon />,
};
export default meta;
