import type { ReactElement } from 'react';
import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import type { StudioTableProps } from './index';
import { StudioTable } from './index';

type Story = StoryFn<typeof StudioTable>;

export function render(props: StudioTableProps): ReactElement {
  return (
    <StudioTable {...props}>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>Header 1</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>Header 2</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>Header 3</StudioTable.HeaderCell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        <StudioTable.Row>
          <StudioTable.Cell>Row 1, column 1</StudioTable.Cell>
          <StudioTable.Cell>Row 1, column 2</StudioTable.Cell>
          <StudioTable.Cell>Row 1, column 3</StudioTable.Cell>
        </StudioTable.Row>
        <StudioTable.Row>
          <StudioTable.Cell>Row 2, column 1</StudioTable.Cell>
          <StudioTable.Cell>Row 2, column 2</StudioTable.Cell>
          <StudioTable.Cell>Row 2, column 3</StudioTable.Cell>
        </StudioTable.Row>
        <StudioTable.Row>
          <StudioTable.Cell>Row 3, column 1</StudioTable.Cell>
          <StudioTable.Cell>Row 3, column 2</StudioTable.Cell>
          <StudioTable.Cell>Row 3, column 3</StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Body>
    </StudioTable>
  );
}

const meta: Meta<Story> = {
  title: 'Studio/StudioTable',
  component: StudioTable,
  render,
};
export default meta;
