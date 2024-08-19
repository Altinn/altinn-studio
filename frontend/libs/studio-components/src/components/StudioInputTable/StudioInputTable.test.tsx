import type { ReactNode, RefObject } from 'react';
import React from 'react';
import { StudioInputTable } from './';
import { render, RenderResult, screen } from '@testing-library/react';
import { TestTable } from './test-data/TestTable';
import type { StudioInputTableProps } from './StudioInputTable';
import {
  buttonLabel,
  checkboxLabel,
  headerCheckboxLabel,
  textareaLabel,
  textfieldLabel,
} from './test-data/testTableData';
import userEvent from '@testing-library/user-event';
import { expect } from '@storybook/test';
import { verifyRefForwarding } from '../../test-utils/verifyRefForwarding';

describe('StudioInputTable', () => {
  it('Renders a table', () => {
    renderStudioInputTable();
    getTable();
  });

  it('Forwards the ref if provided', () => {
    const renderTable = (ref: RefObject<HTMLTableElement>) => (
      <StudioInputTable ref={ref}>
        <StudioInputTable.Body>
          <StudioInputTable.Row>
            <StudioInputTable.Cell />
          </StudioInputTable.Row>
        </StudioInputTable.Body>
      </StudioInputTable>
    );
    verifyRefForwarding<HTMLTableElement>(renderTable, getTable);
  });

  it('Appends the given class to the table', () => {
    const customClass = 'customClass';
    renderStudioInputTable({ className: customClass });
    const table = getTable();
    expect(table).toHaveClass('inputTable');
    expect(table).toHaveClass(customClass);
  });

  it('Applies the given props to the table', () => {
    const testId = 'testId';
    renderStudioInputTable({ 'data-testid': testId } as StudioInputTableProps);
    screen.getByTestId(testId);
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

  it('Focuses on the first input element when the user tabs into the table', async () => {
    const user = userEvent.setup();
    render(<TestTable />);
    const firstInput = getCheckbox(headerCheckboxLabel);
    await user.tab();
    expect(firstInput).toHaveFocus();
  });

  it('Moves focus out of the table when the user first tabs into it and then tabs again', async () => {
    const user = userEvent.setup();
    render(<TestTable />);
    await user.tab();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('Lets the user focus on the input elements using the arrow keys', async () => {
    const user = userEvent.setup();
    render(<TestTable />);
    const headerCheckbox = getCheckbox(headerCheckboxLabel);
    await user.tab();
    expect(headerCheckbox).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // No input elements to the right - keep in same poisition
    expect(headerCheckbox).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // Move down to checkbox 1
    expect(getCheckboxInRow(1)).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // Move down to textfield 1
    expect(getTextfieldInRow(1)).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // Move down to textfield 2
    expect(getTextfieldInRow(2)).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // Move right to textarea 2
    expect(getTextareaInRow(2)).toHaveFocus();
    await user.keyboard('{ArrowRight}'); // Move right to button 2
    expect(getButtonInRow(2)).toHaveFocus();
    await user.keyboard('{ArrowUp}'); // Move up to button 1
    expect(getButtonInRow(1)).toHaveFocus();
    await user.keyboard('{ArrowLeft}'); // Move left to textarea 1
    expect(getTextareaInRow(1)).toHaveFocus();
  });

  type TextboxTestCase = () => HTMLInputElement | HTMLTextAreaElement;
  const textboxTestCases: { [key: string]: TextboxTestCase } = {
    textfield: () => getTextfieldInRow(2),
    textarea: () => getTextareaInRow(2),
  };
  type TextboxTestCaseName = keyof typeof textboxTestCases;
  const textboxTestCaseNames: TextboxTestCaseName[] = Object.keys(textboxTestCases);

  it.each(textboxTestCaseNames)(
    'Lets the user move the caret in %s elements using the arrow keys',
    async (key) => {
      const user = userEvent.setup();
      render(<TestTable />);
      const textbox = textboxTestCases[key]();
      await user.type(textbox, 'test');
      await user.keyboard('{ArrowLeft}'); // Text field should keep focus and move caret to the left
      expect(textbox).toHaveFocus();
      expectCaretPosition(textbox, 3);
      await user.keyboard('{ArrowRight}'); // Text field should keep focus and move caret to the right
      expect(textbox).toHaveFocus();
      expectCaretPosition(textbox, 4);
      await user.keyboard('{ArrowRight}'); // Focus should move to the next input element since the caret is at the end
      expect(textbox).not.toHaveFocus();
    },
  );

  it.each(textboxTestCaseNames)('Selects the text in %s elements on focus', async (key) => {
    const user = userEvent.setup();
    render(<TestTable />);
    const textbox = textboxTestCases[key]();
    await user.type(textbox, 'test');
    await user.keyboard('{ArrowRight}'); // Move focus out
    await user.keyboard('{ArrowLeft}'); // Move focus back in - now the text should be selected
    expect(textbox.selectionStart).toBe(0);
    expect(textbox.selectionEnd).toBe(4);
  });

  describe.each(textboxTestCaseNames)(
    'Does not move focus when text in a %s is selected and the user presses an arrow key',
    (key) => {
      const arrowKeys: ArrowKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

      test.each(arrowKeys)('%s', async (arrowKey) => {
        const user = userEvent.setup();
        render(<TestTable />);
        const textbox = textboxTestCases[key]();
        await user.type(textbox, 'test');
        selectAllText(textbox);
        await user.keyboard(`{${arrowKey}}`);
        expect(textbox).toHaveFocus();
      });
    },
  );

  describe.each(textboxTestCaseNames)(
    'Moves focus from %s when the user presses an arrow key and caret cannot be moved further',
    (key) => {
      const arrowKeysThatShouldMoveFocusWhenCaretIsAtStart: ArrowKey[] = ['ArrowUp', 'ArrowLeft'];
      const arrowKeysThatShouldMoveFocusWhenCaretIsAtEnd: ArrowKey[] = ['ArrowDown', 'ArrowRight'];

      it.each(arrowKeysThatShouldMoveFocusWhenCaretIsAtStart)(
        'Moves focus when caret is at start and user presses %s',
        async (arrowKey) => {
          const user = userEvent.setup();
          render(<TestTable />);
          const textbox = textboxTestCases[key]();
          await user.type(textbox, 'test');
          placeCaretAtStart(textbox);
          await user.keyboard(`{${arrowKey}}`);
          expect(textbox).not.toHaveFocus();
        },
      );

      it.each(arrowKeysThatShouldMoveFocusWhenCaretIsAtEnd)(
        'Moves focus when caret is at end and user presses %s',
        async (arrowKey) => {
          const user = userEvent.setup();
          render(<TestTable />);
          const textbox = textboxTestCases[key]();
          await user.type(textbox, 'test');
          placeCaretAtEnd(textbox);
          await user.keyboard(`{${arrowKey}}`);
          expect(textbox).not.toHaveFocus();
        },
      );
    },
  );

  describe.each(textboxTestCaseNames)(
    'Does not move focus when the user presses an arrow key and the caret is in the middle of the text in a %s',
    () => {
      const arrowKeys: ArrowKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

      it.each(arrowKeys)('%s', async (arrowKey) => {
        const user = userEvent.setup();
        render(<TestTable />);
        const textbox = textboxTestCases.textfield();
        await user.type(textbox, 'test');
        placeCaretAtPosition(textbox, 2);
        await user.keyboard(`{${arrowKey}}`);
        expect(textbox).toHaveFocus();
      });
    },
  );

  describe('Frowards the refs to the input elements', () => {
    type TestCase<Element extends HTMLElement = HTMLElement> = {
      render: (ref: RefObject<Element>) => ReactNode;
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
        render: (ref) => (
          <SingleRow>
            <StudioInputTable.Cell.Checkbox value='test' aria-label={testLabel} ref={ref} />
          </SingleRow>
        ),
        getElement: () => getCheckbox(testLabel),
      },
      textfield: {
        render: (ref) => (
          <SingleRow>
            <StudioInputTable.Cell.Textfield label={testLabel} ref={ref} />
          </SingleRow>
        ),
        getElement: () => getTextbox(testLabel) as HTMLInputElement,
      },
      textarea: {
        render: (ref) => (
          <SingleRow>
            <StudioInputTable.Cell.Textarea label={testLabel} ref={ref} />
          </SingleRow>
        ),
        getElement: () => getTextbox(testLabel) as HTMLTextAreaElement,
      },
      button: {
        render: (ref) => (
          <SingleRow>
            <StudioInputTable.Cell.Button ref={ref}>{testLabel}</StudioInputTable.Cell.Button>
          </SingleRow>
        ),
        getElement: () => getButton(testLabel),
      },
    };

    it.each(Object.keys(testCases))('%s', (key) => {
      const { render, getElement } = testCases[key];
      verifyRefForwarding(render, getElement);
    });
  });
});

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const renderStudioInputTable = (props: StudioInputTableProps = {}) =>
  render(<TestTable {...props} />);

const getTable = (): HTMLTableElement => screen.getByRole('table');
const getCheckbox = (name: string): HTMLInputElement =>
  screen.getByRole('checkbox', { name }) as HTMLInputElement;
const getCheckboxInRow = (rowNumber: number): HTMLInputElement =>
  getCheckbox(checkboxLabel(rowNumber));
const getTextbox = (name: string) => screen.getByRole('textbox', { name });
const getTextfieldInRow = (rowNumber: number): HTMLInputElement =>
  getTextbox(textfieldLabel(rowNumber)) as HTMLInputElement;
const getTextareaInRow = (rowNumber: number): HTMLTextAreaElement =>
  getTextbox(textareaLabel(rowNumber)) as HTMLTextAreaElement;
const getButton = (name: string): HTMLButtonElement =>
  screen.getByRole('button', { name }) as HTMLButtonElement;
const getButtonInRow = (rowNumber: number): HTMLButtonElement =>
  getButton(buttonLabel(rowNumber)) as HTMLButtonElement;

function expectCaretPosition(
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number,
): void {
  expect(element.selectionStart).toBe(position);
  expect(element.selectionEnd).toBe(position);
}

function selectAllText(element: HTMLInputElement | HTMLTextAreaElement): void {
  element.setSelectionRange(0, element.value.length);
}

function placeCaretAtStart(element: HTMLInputElement | HTMLTextAreaElement): void {
  placeCaretAtPosition(element, 0);
}

function placeCaretAtEnd(element: HTMLInputElement | HTMLTextAreaElement): void {
  placeCaretAtPosition(element, element.value.length);
}

function placeCaretAtPosition(
  element: HTMLInputElement | HTMLTextAreaElement,
  position: number,
): void {
  element.setSelectionRange(position, position);
}

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
