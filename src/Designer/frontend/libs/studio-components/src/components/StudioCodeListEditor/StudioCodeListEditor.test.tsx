import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { StudioCodeListEditorProps } from './StudioCodeListEditor';
import { StudioCodeListEditor } from './StudioCodeListEditor';
import type { CodeList } from './types/CodeList';
import userEvent from '@testing-library/user-event';
import { texts } from './test-data/texts';
import { codeList } from './test-data/codeList';
import { CodeListItemTextProperty } from './enums/CodeListItemTextProperty';

// Test data:
const onInvalid = jest.fn();
const onUpdateCodeList = jest.fn();
const language = 'nb';
const defaultProps: StudioCodeListEditorProps = {
  codeList,
  language,
  texts,
  onInvalid,
  onUpdateCodeList,
};
const duplicatedValue = 'duplicate';
const codeListWithDuplicatedValues: CodeList = [
  {
    label: { nb: 'Test 1' },
    value: duplicatedValue,
  },
  {
    label: { nb: 'Test 2' },
    value: duplicatedValue,
  },
  {
    label: { nb: 'Test 3' },
    value: 'unique',
  },
];

const numberOfHeadingRows = 1;

describe('StudioCodeListEditor', () => {
  afterEach(jest.clearAllMocks);

  it('Renders a group element with the given title', () => {
    renderCodeListEditor();
    expect(screen.getByRole('group', { name: texts.codeList })).toBeInTheDocument();
  });

  it('Renders a table of code list items', () => {
    renderCodeListEditor();
    expect(screen.getByRole('table')).toBeInTheDocument();
    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows);
  });

  it('Renders the given column headers', () => {
    renderCodeListEditor();
    expect(screen.getByRole('columnheader', { name: texts.value })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.label })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.description })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.helpText })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: texts.delete })).toBeInTheDocument();
  });

  it('Renders a button to add a new code list item', () => {
    renderCodeListEditor();
    expect(screen.getByRole('button', { name: texts.add })).toBeInTheDocument();
  });

  describe('onUpdateCodeList', () => {
    it('Calls the onUpdateCodeList callback with the new code list when a value field is changed', async () => {
      const user = userEvent.setup();
      renderCodeListEditor();
      const testRowNumber = 1;
      const newValue = 'new text';

      await user.type(
        screen.getByRole('textbox', { name: texts.itemValue(testRowNumber) }),
        newValue,
      );
      await user.tab();

      expect(onUpdateCodeList).toHaveBeenCalledTimes(newValue.length);
      expect(onUpdateCodeList).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ value: newValue })]),
      );
    });

    it.each(Object.values(CodeListItemTextProperty))(
      'Calls the onUpdateCodeList callback with the new code list when a %s is changed',
      async (property: CodeListItemTextProperty) => {
        const user = userEvent.setup();
        const propertyCoords: TextPropertyCoords = [1, property];
        const newText = 'Lorem ipsum';

        renderCodeListEditor();
        await user.type(getTextInput(propertyCoords), newText);

        expect(onUpdateCodeList).toHaveBeenLastCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              [property]: expect.objectContaining({ [language]: newText }),
            }),
          ]),
        );
      },
    );
  });

  it('Calls the onUpdateCodeList callback with the new code list when an item is removed', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const deleteButton = screen.getByRole('button', { name: texts.deleteItem(1) });
    await user.click(deleteButton);
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith([codeList[1], codeList[2]]);
  });

  it('Calls the onUpdateCodeList callback with the new code list when an item is added', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(onUpdateCodeList).toHaveBeenCalledTimes(1);
    expect(onUpdateCodeList).toHaveBeenCalledWith([
      ...codeList,
      expect.objectContaining({ value: '' }),
    ]);
  });

  it('Updates itself when the user changes something', async () => {
    const user = userEvent.setup();
    renderCodeListEditor();
    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    const addButton = screen.getByRole('button', { name: texts.add });
    await user.click(addButton);
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows + 1);
  });

  it('Rerenders with the new code list when the code list prop changes', () => {
    const newCodeList = [
      {
        label: { nb: 'Ny test 1' },
        value: 'newTest1',
      },
      {
        label: { nb: 'Ny test 2' },
        value: 'newTest2',
      },
    ];

    const { rerender } = renderCodeListEditor();

    const numberOfCodeListItems = codeList.length;
    const expectedNumberOfRows = numberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRows);

    rerender(<StudioCodeListEditor {...defaultProps} codeList={newCodeList} />);

    const newNumberOfCodeListItems = newCodeList.length;
    const newExpectedNumberOfRows = newNumberOfCodeListItems + numberOfHeadingRows;
    expect(screen.getAllByRole('row')).toHaveLength(newExpectedNumberOfRows);
  });

  describe('Invalid code list handling', () => {
    it('Applies invalid state to duplicated values', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const firstDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(1) });
      const secondDuplicateInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      expect(firstDuplicateInput).toBeInvalid();
      expect(secondDuplicateInput).toBeInvalid();
    });

    it('Does not apply invalid state to unique values when other values are duplicated', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const uniqueValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      expect(uniqueValueInput).toBeValid();
    });

    it('Renders a general error message when there are errors', () => {
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      expect(screen.getByText(texts.generalError)).toBeInTheDocument();
    });

    it('Does not render the error message when the code list is valid', () => {
      renderCodeListEditor();
      expect(screen.queryByText(texts.generalError)).not.toBeInTheDocument();
    });

    it('Does not trigger onUpdateCodeList while the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const addButton = screen.getByRole('button', { name: texts.add });
      await user.click(addButton);
      expect(onUpdateCodeList).not.toHaveBeenCalled();
    });

    it('Triggers onInvalid when the user changes something and the code list is invalid', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const validValueInput = screen.getByRole('textbox', { name: texts.itemValue(3) });
      const newValue = 'new value';
      await user.type(validValueInput, newValue);
      expect(onInvalid).toHaveBeenCalledTimes(newValue.length);
    });

    it('Does not trigger onInvalid when an invalid code list is changed to a valid state', async () => {
      const user = userEvent.setup();
      renderCodeListEditor({ codeList: codeListWithDuplicatedValues });
      const invalidValueInput = screen.getByRole('textbox', { name: texts.itemValue(2) });
      await user.type(invalidValueInput, 'new unique value');
      expect(onInvalid).not.toHaveBeenCalled();
    });
  });

  it('Renders without errors when no callbacks are provided and the user changes something', async () => {
    const user = userEvent.setup();
    renderCodeListEditor({
      onUpdateCodeList: undefined,
      onInvalid: undefined,
    });
    const labelInput = screen.getByRole('textbox', { name: texts.itemLabel(1) });
    const newValue = 'new text';
    await user.type(labelInput, newValue);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('Renders the empty text when the code list is empty', () => {
    renderCodeListEditor({ codeList: [] });
    expect(screen.getByText(texts.emptyCodeList)).toBeInTheDocument();
  });
});

function renderCodeListEditor(props: Partial<StudioCodeListEditorProps> = {}): RenderResult {
  return render(<StudioCodeListEditor {...defaultProps} {...props} />);
}

type TextPropertyCoords = [number, CodeListItemTextProperty];

function getTextInput(textPropertyCoords: TextPropertyCoords): HTMLElement {
  const name = textInputName(textPropertyCoords);
  return screen.getByRole('textbox', { name });
}

function textInputName([itemNumber, property]: TextPropertyCoords): string {
  const propertyKey = textInputNameKey(property);
  return texts[propertyKey](itemNumber);
}

function textInputNameKey<P extends CodeListItemTextProperty>(property: P): `item${Capitalize<P>}` {
  const keyMap: { [Key in CodeListItemTextProperty]: `item${Capitalize<Key>}` } = {
    [CodeListItemTextProperty.Label]: 'itemLabel',
    [CodeListItemTextProperty.Description]: 'itemDescription',
    [CodeListItemTextProperty.HelpText]: 'itemHelpText',
  };
  return keyMap[property];
}
