import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioTreeView } from './index';

import { PencilIcon } from '@studio/icons';

const PreviewComponent = (args): React.ReactElement => (
  <StudioTreeView.Root>
    <StudioTreeView.Item {...args} />
  </StudioTreeView.Root>
);

const meta = {
  title: 'Components/StudioTreeView',
  component: PreviewComponent,
} satisfies Meta<typeof PreviewComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'MyFile.pdf',
    label: 'Folder name',
    nodeId: '1',
  },
};

export const WithIcon: Story = {
  args: {
    children: 'MyFile.pdf',
    label: 'Folder name',
    nodeId: '1',
    icon: <PencilIcon />,
  },
};
