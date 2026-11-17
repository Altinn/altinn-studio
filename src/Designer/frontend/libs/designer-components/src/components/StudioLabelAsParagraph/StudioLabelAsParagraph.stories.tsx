import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioLabelAsParagraph } from './StudioLabelAsParagraph';

const meta = {
  title: 'Components/StudioLabelAsParagraph',
  component: StudioLabelAsParagraph,
} satisfies Meta<typeof StudioLabelAsParagraph>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    children: 'Paragraph in bold',
  },
};
