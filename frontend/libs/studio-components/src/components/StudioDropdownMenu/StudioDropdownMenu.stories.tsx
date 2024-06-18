import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { StudioDropdownMenu } from './index';

const studioDropdownMenuPlacementOptions: string[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-start',
  'top-end',
  'right-start',
  'right-end',
  'bottom-start',
  'bottom-end',
  'left-start',
  'left-end',
];
const studioDropdownMenuSizeOptions: string[] = ['small', 'medium', 'large'];

type Story = StoryFn<typeof StudioDropdownMenu>;

const meta: Meta = {
  title: 'Studio/StudioDropdownMenu',
  component: StudioDropdownMenu,
  argTypes: {
    placement: {
      control: 'select',
      options: studioDropdownMenuPlacementOptions,
    },
    size: {
      control: 'select',
      options: studioDropdownMenuSizeOptions,
    },
  },
};

export const Preview: Story = (args): React.ReactElement => {
  const [open, setOpen] = useState(false);
  return (
    <StudioDropdownMenu open={open} onClose={() => setOpen(false)} {...args}>
      <StudioDropdownMenu.Trigger setOpen={() => setOpen((oldState) => !oldState)}>
        Dropdown
      </StudioDropdownMenu.Trigger>
      {open && (
        <StudioDropdownMenu.Content>
          <StudioDropdownMenu.Group heading='My heading'>
            <StudioDropdownMenu.Item asChild>
              <a href='https://altinn.studio' rel='noreferrer' target='_blank'>
                Altinn Studio
              </a>
            </StudioDropdownMenu.Item>
          </StudioDropdownMenu.Group>
        </StudioDropdownMenu.Content>
      )}
    </StudioDropdownMenu>
  );
};

Preview.args = {
  placement: 'bottom',
  size: 'medium',
};

export default meta;
