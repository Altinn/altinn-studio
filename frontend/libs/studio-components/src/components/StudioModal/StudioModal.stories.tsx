import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StudioModalRoot } from './StudioModalRoot';
import { StudioModalDialog } from './StudioModalDialog';
import { StudioModalTrigger } from './StudioModalTrigger';
import { StudioModal } from './index';
import { userEvent, within, expect } from '@storybook/test';
import { HouseIcon } from '@studio/icons';

const meta: Meta<typeof StudioModalRoot> = {
  title: 'Studio/StudioModal',
  component: StudioModalRoot,
  subcomponents: { StudioModalTrigger, StudioModalDialog },
};
export default meta;

type Story = StoryObj<typeof StudioModalRoot>;

export const Default: Story = {
  render: (args): React.ReactElement => (
    <StudioModal.Root>
      <StudioModal.Trigger>Åpne modal</StudioModal.Trigger>
      <StudioModal.Dialog
        heading='Lorem ipsum dolor sit amet'
        icon={<HouseIcon />}
        subheading='Consectetur adipiscing elit.'
        footer='Mauris et dictum mauris. In urna velit, dapibus.'
      >
        Donec suscipit et nulla vel iaculis. Aliquam in tellus quis sem malesuada rhoncus non vitae
        lorem. Morbi sed dolor pulvinar velit eleifend eleifend. Ut molestie ex neque, vel elementum
        odio fringilla vel. Nunc consectetur urna eget ex congue, in accumsan dui vestibulum. Donec
        aliquet massa vitae nibh mollis, nec viverra eros venenatis. Sed ac accumsan enim. Quisque
        elementum elit sollicitudin interdum luctus. Fusce lacinia mattis consectetur. Aenean
        vehicula orci vitae dolor imperdiet scelerisque. Curabitur hendrerit gravida erat ut
        tincidunt. Proin dui ante, euismod vehicula finibus vitae, eleifend ac dolor. Etiam lobortis
        neque eget elit varius, quis laoreet est laoreet. Nunc ac congue turpis, non lobortis nisi.
        Fusce lectus leo, porta vitae ligula ut, sagittis pretium eros.
      </StudioModal.Dialog>
    </StudioModal.Root>
  ),
  args: {},
};

export const Open: Story = {
  ...Default,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    expect(canvas.getByRole('dialog')).toBeInTheDocument();
  },
};
