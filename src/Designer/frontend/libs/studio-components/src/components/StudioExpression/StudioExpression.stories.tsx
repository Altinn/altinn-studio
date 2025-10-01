import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { StudioExpression } from './StudioExpression';
import { logicalExpression } from './test-data/expressions';
import { texts } from './test-data/texts';
import { dataLookupOptions } from './test-data/dataLookupOptions';

type Story = StoryFn<typeof StudioExpression>;

const meta: Meta = {
  title: 'Components/StudioExpression',
  component: StudioExpression,
};
export const Preview: Story = (args): React.ReactElement => <StudioExpression {...args} />;

Preview.args = {
  expression: logicalExpression,
  texts: texts,
  dataLookupOptions: dataLookupOptions,
};
export default meta;
