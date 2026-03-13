import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioDropdown } from './index';
import { PencilIcon, UploadIcon } from '@studio/icons';

const ComposedComponent = (args): ReactElement => (
  <StudioDropdown triggerButtonText='My menu label'>
    <StudioDropdown.List>
      <StudioDropdown.Heading>My heading</StudioDropdown.Heading>
      <StudioDropdown.Item>
        <StudioDropdown.Button {...args} />
      </StudioDropdown.Item>
      <StudioDropdown.Item>
        <StudioDropdown.FileUploaderButton
          icon={<UploadIcon />}
          fileInputProps={{
            accept: '.txt',
            multiple: false,
          }}
          uploadButtonText='Upload File'
        />
      </StudioDropdown.Item>
    </StudioDropdown.List>
  </StudioDropdown>
);

const meta = {
  title: 'Components/StudioDropdownMenu',
  component: ComposedComponent,
  argTypes: {
    placement: {
      control: 'radio',
      options: [
        'top',
        'right',
        'bottom',
        'left',
        'bottom-start',
        'bottom-end',
        'top-start',
        'top-end',
        'right-start',
        'right-end',
        'left-start',
        'left-end',
      ],
    },
  },
} satisfies Meta<typeof ComposedComponent>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Item',
    placement: 'bottom-start',
    icon: <PencilIcon />,
  },
};
