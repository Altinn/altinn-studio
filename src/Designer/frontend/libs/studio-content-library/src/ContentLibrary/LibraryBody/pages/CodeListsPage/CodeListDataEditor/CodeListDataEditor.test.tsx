import { fruitsData } from '../test-data/codeListMap';
import { CodeListDataEditor } from './CodeListDataEditor';
import type { CodeListDataEditorProps } from './CodeListDataEditor';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import React from 'react';
import { userEvent } from '@testing-library/user-event';

// Test data:
const data = fruitsData;
const onUpdate = jest.fn();
const onDelete = jest.fn();
const defaultProps: CodeListDataEditorProps = { data, onUpdate, onDelete };

describe('CodeListDataEditor', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders the code list editor with given content', () => {
    renderCodeListDataEditor();
    const expectedNumberOfRowsIncludingHeaders = data.codes.length + 1;
    expect(screen.getAllByRole('row')).toHaveLength(expectedNumberOfRowsIncludingHeaders);
  });

  it('Renders an input field with the given name', () => {
    renderCodeListDataEditor();
    expect(getNameInput()).toHaveValue(data.name);
  });

  it('Calls onUpdate with updated data when the code list name is changed', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    const additionalCharacter = 'a';
    const newName = data.name + additionalCharacter;
    await user.type(getNameInput(), additionalCharacter);
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ name: newName }));
  });

  it('Calls onUpdate with updated data when one of the codes is changed', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    const newFirstCode = 'a';
    const firstCodeInputLabel = textMock('code_list_editor.value_item', { number: 1 });
    const firstCodeInput = screen.getByRole('textbox', { name: firstCodeInputLabel });
    await user.type(firstCodeInput, newFirstCode);
    expect(onUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        codes: expect.arrayContaining([expect.objectContaining({ value: newFirstCode })]),
      }),
    );
  });

  it('Calls onDelete when the delete button is clicked', async () => {
    const user = userEvent.setup();
    renderCodeListDataEditor();
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

function renderCodeListDataEditor(props: Partial<CodeListDataEditorProps> = {}): RenderResult {
  return render(<CodeListDataEditor {...defaultProps} {...props} />);
}

function getNameInput(): HTMLElement {
  const nameInputLabel = textMock('app_content_library.code_lists.name');
  return screen.getByRole('textbox', { name: nameInputLabel });
}
