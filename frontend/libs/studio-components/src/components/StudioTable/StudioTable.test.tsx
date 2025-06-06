import type { ForwardedRef } from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { StudioTableProps } from './';
import { StudioTable } from './';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import type { RenderResult } from '@testing-library/react';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

// Test data:
const headContents = ['Header 1', 'Header 2'];
const bodyContents = [
  ['Row 1, column 1', 'Row 1, column 2'],
  ['Row 2, column 1', 'Row 2, column 2'],
];

describe('StudioTable', () => {
  it('Renders a table', () => {
    renderTable();
    expect(getTable()).toBeInTheDocument();
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLTableElement>((ref) => renderTable({}, ref), getTable);
  });

  it('Appends custom attributes', () => {
    testCustomAttributes(renderTable, getTable);
  });

  it('Appends the given class name to the root element', () => {
    testRootClassNameAppending((className) => renderTable({ className }));
  });

  it('Renders the given column headers', () => {
    renderTable();
    expect(screen.getByRole('columnheader', { name: headContents[0] })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: headContents[1] })).toBeInTheDocument();
  });

  it('Renders cells with the given content', () => {
    renderTable();
    expect(screen.getByRole('cell', { name: bodyContents[0][0] })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: bodyContents[0][1] })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: bodyContents[1][0] })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: bodyContents[1][1] })).toBeInTheDocument();
  });
});

const renderTable = (
  props: StudioTableProps = {},
  ref?: ForwardedRef<HTMLTableElement>,
): RenderResult => {
  return render(
    <StudioTable {...props} ref={ref}>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.HeaderCell>{headContents[0]}</StudioTable.HeaderCell>
          <StudioTable.HeaderCell>{headContents[1]}</StudioTable.HeaderCell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        <StudioTable.Row>
          <StudioTable.Cell>{bodyContents[0][0]}</StudioTable.Cell>
          <StudioTable.Cell>{bodyContents[0][1]}</StudioTable.Cell>
        </StudioTable.Row>
        <StudioTable.Row>
          <StudioTable.Cell>{bodyContents[1][0]}</StudioTable.Cell>
          <StudioTable.Cell>{bodyContents[1][1]}</StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Body>
    </StudioTable>,
  );
};

function getTable(): HTMLTableElement {
  return screen.getByRole('table');
}
