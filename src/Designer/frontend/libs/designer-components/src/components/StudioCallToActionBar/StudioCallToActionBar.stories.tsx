import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { StudioCallToActionBar } from '.';

const meta = {
  title: 'Components/StudioCallToActionBar',
  component: StudioCallToActionBar,
} satisfies Meta<typeof StudioCallToActionBar>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'The blue bar below with the add button is the component',
    onClick: action('Action button is clicked'),
    isVisible: false,
    title: 'My awesome action',
  },
};
