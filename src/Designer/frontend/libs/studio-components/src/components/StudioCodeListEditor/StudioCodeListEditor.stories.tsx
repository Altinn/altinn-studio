import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import { texts } from './test-data/texts';
import { codeList } from './test-data/codeList';

type Story = StoryObj<typeof StudioCodeListEditor>;

const meta: Meta<typeof StudioCodeListEditor> = {
  title: 'Components/StudioCodeListEditor',
  component: StudioCodeListEditor,
};
export default meta;

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
