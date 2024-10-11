import type { ForwardedRef, ReactNode } from 'react';
import React from 'react';
import { StudioInputTable } from './';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { TestTable } from './test-data/TestTable';
import type { StudioInputTableProps } from './StudioInputTable';
import { expect } from '@storybook/test';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioInputTable', () => {
  it('Renders a table', () => {
    renderStudioInputTable();
    expect(getTable()).toBeInTheDocument();
  });

  it('Forwards the ref if provided', () => {
    const renderTable = (ref: ForwardedRef<HTMLTableElement>) =>
      render(
        <StudioInputTable ref={ref}>
          <StudioInputTable.Body>
            <StudioInputTable.Row>
              <StudioInputTable.Cell />
            </StudioInputTable.Row>
          </StudioInputTable.Body>
        </StudioInputTable>,
      );
    testRefForwarding<HTMLTableElement>(renderTable, getTable);
  });

  it('Appends the given class to the table', () => {
    testRootClassNameAppending((className) => renderStudioInputTable({ className }));
  });

  it('Applies the given props to the table', () => {
    testCustomAttributes<HTMLTableElement>(renderStudioInputTable, getTable);
  });

  it('Renders all headers', () => {
    render(<TestTable />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(expectedNumberOfColumns);
  });

  it('Renders all rows', () => {
    render(<TestTable />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(expectedNumberOfRows);
  });

  describe('Forwards the refs to the input elements', () => {
    type TestCase<Element extends HTMLElement = HTMLElement> = {
      render: (ref: ForwardedRef<Element>) => RenderResult;
      getElement: () => Element;
    };
    const testLabel = 'test';
    const testCases: {
      checkbox: TestCase<HTMLInputElement>;
      textfield: TestCase<HTMLInputElement>;
      textarea: TestCase<HTMLTextAreaElement>;
      button: TestCase<HTMLButtonElement>;
    } = {
      checkbox: {
        render: (ref) =>
          render(
            <SingleRow>
              <StudioInputTable.Cell.Checkbox value='test' aria-label={testLabel} ref={ref} />
            </SingleRow>,
          ),
        getElement: () => getCheckbox(testLabel),
      },
      textfield: {
        render: (ref) =>
          render(
            <SingleRow>
              <StudioInputTable.Cell.Textfield label={testLabel} ref={ref} />
            </SingleRow>,
          ),
        getElement: () => getTextbox(testLabel) as HTMLInputElement,
      },
      textarea: {
        render: (ref) =>
          render(
            <SingleRow>
              <StudioInputTable.Cell.Textarea label={testLabel} ref={ref} />
            </SingleRow>,
          ),
        getElement: () => getTextbox(testLabel) as HTMLTextAreaElement,
      },
      button: {
        render: (ref) =>
          render(
            <SingleRow>
              <StudioInputTable.Cell.Button ref={ref}>{testLabel}</StudioInputTable.Cell.Button>
            </SingleRow>,
          ),
        getElement: () => getButton(testLabel),
      },
    };

    it.each(Object.keys(testCases))('%s', (key) => {
      const { render: renderComponent, getElement } = testCases[key];
      testRefForwarding(renderComponent, getElement);
    });
  });
});

const renderStudioInputTable = (props: StudioInputTableProps = {}) =>
  render(<TestTable {...props} />);

const getTable = (): HTMLTableElement => screen.getByRole('table');
const getCheckbox = (name: string): HTMLInputElement =>
  screen.getByRole('checkbox', { name }) as HTMLInputElement;
const getTextbox = (name: string) => screen.getByRole('textbox', { name });
const getButton = (name: string): HTMLButtonElement =>
  screen.getByRole('button', { name }) as HTMLButtonElement;

const expectedNumberOfColumns = 5;
const expectedNumberOfHeaderRows = 1;
const expectedNumberOfBodyRows = 3;
const expectedNumberOfRows = expectedNumberOfBodyRows + expectedNumberOfHeaderRows;

function SingleRow({ children }: { children: ReactNode }) {
  return (
    <StudioInputTable>
      <StudioInputTable.Body>
        <StudioInputTable.Row>{children}</StudioInputTable.Row>
      </StudioInputTable.Body>
    </StudioInputTable>
  );
}
