import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import { textResources } from './test-data/textResources';
import { texts } from './test-data/texts';
import { codeListWithStrings } from './test-data/codeListWithStrings';
import { codeListWithoutTextResources } from './test-data/codeListWithoutTextResources';

const meta = {
  title: 'Components/StudioCodeListEditor',
  component: StudioCodeListEditor,
} satisfies Meta<typeof StudioCodeListEditor>;
export default meta;

type Story = StoryObj<typeof StudioCodeListEditor>;

export const WithTextResources: Story = {
  args: {
    codeList: codeListWithStrings,
    textResources,
    texts,
  },
};

export const WithEmptyTextResourceList: Story = {
  args: {
    codeList: codeListWithoutTextResources,
    textResources: [],
    texts,
  },
};

export const Empty: Story = {
  args: {
    codeList: [],
    textResources: [],
    texts,
  },
};
