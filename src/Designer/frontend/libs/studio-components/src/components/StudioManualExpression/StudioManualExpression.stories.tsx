import type { Meta, StoryObj } from '@storybook/react-vite';
import { logicalExpression } from '../StudioExpression/test-data/expressions';
import { texts } from '../StudioExpression/test-data/texts';
import { StudioManualExpression } from './StudioManualExpression';
import { fn } from 'storybook/test';

const meta = {
  title: 'Components/StudioManualExpression',
  component: StudioManualExpression,
} satisfies Meta<typeof StudioManualExpression>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    expression: logicalExpression,
    texts: texts,
    onValidExpressionChange: fn(),
    onValidityChange: fn(),
  },
};
