import type { Meta, StoryObj } from '@storybook/react';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import { codeListWithStrings } from './test-data/codeLists';
import { texts } from './test-data/texts';

type Story = StoryObj<typeof StudioCodeListEditor>;

const meta: Meta<typeof StudioCodeListEditor> = {
  title: 'Components/StudioCodeListEditor',
  component: StudioCodeListEditor,
};
export default meta;

export const Preview: Story = {
  args: {
    codeList: codeListWithStrings,
    texts,
  },
};
