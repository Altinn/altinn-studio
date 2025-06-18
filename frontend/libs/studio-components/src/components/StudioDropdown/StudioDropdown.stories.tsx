import React from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
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

type Story = StoryFn<typeof ComposedComponent>;

const meta: Meta = {
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
};
export const Preview: Story = (args): React.ReactElement => <ComposedComponent {...args} />;

Preview.args = {
  children: 'Item',
  placement: 'bottom-start',
  icon: <PencilIcon />,
};
export default meta;
