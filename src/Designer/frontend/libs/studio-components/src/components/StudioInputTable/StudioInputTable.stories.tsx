import type { ReactElement } from 'react';
import React from 'react';
import type { Meta, StoryFn } from '@storybook/react-vite';
import { TestTable } from './test-data/TestTable';
import type { StudioInputTableProps } from './StudioInputTable';

type Story = StoryFn<typeof TestTable>;

export function render(props: StudioInputTableProps): ReactElement {
  return <TestTable {...props} />;
}

const meta: Meta<Story> = {
  title: 'Components/StudioInputTable',
  component: TestTable,
  render,
};
export default meta;
