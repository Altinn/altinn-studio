import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioModalRoot } from './StudioModalRoot';
import type { StudioModalDialogProps } from './StudioModalDialog';
import { StudioModalDialog } from './StudioModalDialog';
import { StudioModalTrigger } from './StudioModalTrigger';
import { StudioModal } from './index';
import { userEvent, within, expect } from 'storybook/test';
import * as icons from '../../../../studio-icons';

type PreviewArgs = Omit<StudioModalDialogProps, 'icon'> & {
  icon: string;
};

const noIconOption = 'None';
const iconOptions = [noIconOption, ...Object.keys(icons)];
const renderIcon = (iconName: string) =>
  iconName === noIconOption ? undefined : React.createElement(icons[iconName]);

const render = ({ icon, children, ...rest }: PreviewArgs) => (
  <StudioModal.Root>
    <StudioModal.Trigger>Åpne modal</StudioModal.Trigger>
    <StudioModal.Dialog {...rest} icon={renderIcon(icon)}>
      {children}
    </StudioModal.Dialog>
  </StudioModal.Root>
);

const meta: Meta<PreviewArgs> = {
  title: 'Components/StudioModal',
  component: StudioModalRoot,
  subcomponents: { StudioModalTrigger, StudioModalDialog },
  render,
  argTypes: {
    icon: {
      options: iconOptions,
      control: { type: 'select' },
    },
  },
};
export default meta;

type Story = StoryObj<PreviewArgs>;

export const Default: Story = {
  args: {
    heading: 'Lorem ipsum dolor sit amet',
    icon: 'HouseIcon',
    footer: 'Test',
    closeButtonTitle: 'Close',
    contentPadding: true,
    children:
      'Donec suscipit et nulla vel iaculis. Aliquam in tellus quis sem malesuada rhoncus non vitae lorem. Morbi sed dolor pulvinar velit eleifend eleifend. Ut molestie ex neque, vel elementum odio fringilla vel. Nunc consectetur urna eget ex congue, in accumsan dui vestibulum. Donec aliquet massa vitae nibh mollis, nec viverra eros venenatis. Sed ac accumsan enim. Quisque elementum elit sollicitudin interdum luctus. Fusce lacinia mattis consectetur. Aenean vehicula orci vitae dolor imperdiet scelerisque. Curabitur hendrerit gravida erat ut tincidunt. Proin dui ante, euismod vehicula finibus vitae, eleifend ac dolor. Etiam lobortis neque eget elit varius, quis laoreet est laoreet. Nunc ac congue turpis, non lobortis nisi. Fusce lectus leo, porta vitae ligula ut, sagittis pretium eros.',
  },
};

export const Open: Story = {
  ...Default,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    expect(canvas.getByRole('dialog')).toBeInTheDocument();
  },
};
