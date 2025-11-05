import type { Meta, StoryFn } from '@storybook/react-vite';
import { logicalExpression } from '../StudioExpression/test-data/expressions';
import { texts } from '../StudioExpression/test-data/texts';
import { StudioManualExpression } from './StudioManualExpression';
import { fn } from 'storybook/internal/test';

type Story = StoryFn<typeof StudioManualExpression>;

const meta: Meta = {
  title: 'Components/StudioManualExpression',
  component: StudioManualExpression,
};
export const Preview: Story = (args): React.ReactElement => <StudioManualExpression {...args} />;

Preview.args = {
  expression: logicalExpression,
  texts: texts,
  onValidExpressionChange: fn(),
  onValidityChange: fn(),
};
export default meta;
