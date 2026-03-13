import type { ReactElement } from 'react';
import React from 'react';
import type { Meta } from '@storybook/react-vite';
import { TestTable } from './test-data/TestTable';
import type { StudioInputTableProps } from './StudioInputTable';

export function render(props: StudioInputTableProps): ReactElement {
  return <TestTable {...props} />;
}

const meta = {
  title: 'Components/StudioInputTable',
  component: TestTable,
  render,
} satisfies Meta<typeof TestTable>;
export default meta;
