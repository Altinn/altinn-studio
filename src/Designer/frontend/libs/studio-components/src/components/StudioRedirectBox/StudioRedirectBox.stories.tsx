import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioRedirectBox } from './StudioRedirectBox';
import { StudioParagraph } from '../StudioParagraph';

const meta = {
  title: 'Components/StudioRedirectBox',
  component: StudioRedirectBox,
  argTypes: {
    title: {
      control: 'text',
    },
  },
} satisfies Meta<typeof StudioRedirectBox>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'title',
    children: <StudioParagraph>Children text</StudioParagraph>,
  },
};
