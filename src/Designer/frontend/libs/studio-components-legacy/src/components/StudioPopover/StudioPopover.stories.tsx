import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioPopover } from './StudioPopover';

const studioPopoverPlacementOptions: string[] = [
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
const studioPopoverVariantOptions: string[] = ['default', 'danger', 'info', 'warning'];
const studioPopoverSizeOptions: string[] = ['small', 'medium', 'large'];

const meta = {
  title: 'Components/StudioPopover',
  component: StudioPopover,
  argTypes: {
    placement: {
      control: 'select',
      options: studioPopoverPlacementOptions,
    },
    variant: {
      control: 'radio',
      options: studioPopoverVariantOptions,
    },
    size: {
      control: 'select',
      options: studioPopoverSizeOptions,
    },
  },
} satisfies Meta<typeof StudioPopover>;
export default meta;

type Story = StoryObj<typeof StudioPopover>;

export const Preview: Story = {
  render: (args): React.ReactElement => {
    return (
      <StudioPopover {...args}>
        <StudioPopover.Trigger>My trigger!</StudioPopover.Trigger>
        <StudioPopover.Content>StudioPopover content</StudioPopover.Content>
      </StudioPopover>
    );
  },

  args: {
    placement: 'top',
    variant: 'default',
    size: 'medium',
    onOpenChange: () => {},
  },
};
