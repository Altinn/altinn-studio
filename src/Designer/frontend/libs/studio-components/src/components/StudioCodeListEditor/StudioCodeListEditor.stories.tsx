import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import { texts } from './test-data/texts';
import { codeList } from './test-data/codeList';

const meta = {
  title: 'Components/StudioCodeListEditor',
  component: StudioCodeListEditor,
} satisfies Meta<typeof StudioCodeListEditor>;
export default meta;

type Story = StoryObj<typeof StudioCodeListEditor>;

export const Preview: Story = {
  args: {
    codeList,
    language: 'nb',
    texts,
  },
};

export const Empty: Story = {
  args: {
    codeList: [],
    language: 'nb',
    texts,
  },
};
