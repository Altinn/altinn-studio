import type { ReactElement } from 'react';
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { StudioTableProps } from './';
import { StudioTable } from './';

function TablePreview(props: StudioTableProps): ReactElement {
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

type Story = StoryObj<typeof TablePreview>;

const meta: Meta<typeof TablePreview> = {
  title: 'Components/StudioTable',
  component: TablePreview,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    zebra: {
      control: 'boolean',
    },
    stickyHeader: {
      control: 'boolean',
    },
    border: {
      control: 'boolean',
    },
  },
};
export default meta;

export const Preview: Story = {
  args: {
    size: 'sm',
    zebra: false,
    stickyHeader: false,
    border: false,
  },
};
