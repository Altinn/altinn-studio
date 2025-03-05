import type { Meta, StoryObj } from '@storybook/react';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import { textResources } from './test-data/textResources';
import { texts } from './test-data/texts';
import { codeListWithTextResources } from './test-data/codeListWithTextResources';
import { codeListWithoutTextResources } from './test-data/codeListWithoutTextResources';

type Story = StoryObj<typeof StudioCodeListEditor>;

const meta: Meta<typeof StudioCodeListEditor> = {
  title: 'Components/StudioCodeListEditor',
  component: StudioCodeListEditor,
};
export default meta;

export const WithTextResources: Story = {
  args: {
    codeList: codeListWithTextResources,
    textResources,
    texts,
  },
};

export const WithoutTextResources: Story = {
  args: {
    codeList: codeListWithoutTextResources,
    texts,
  },
};

export const Empty: Story = {
  args: {
    codeList: [],
    texts,
  },
};
