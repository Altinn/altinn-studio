import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioExpression } from './StudioExpression';
import { logicalExpression } from './test-data/expressions';
import { texts } from './test-data/texts';
import { dataLookupOptions } from './test-data/dataLookupOptions';

const meta = {
  title: 'Components/StudioExpression',
  component: StudioExpression,
} satisfies Meta<typeof StudioExpression>;
export default meta;

type Story = StoryObj<typeof StudioExpression>;

export const Preview: Story = {
  args: {
    expression: logicalExpression,
    texts: texts,
    dataLookupOptions: dataLookupOptions,
  },
};
