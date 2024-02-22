import React from 'react';
import { LangSelector } from './LangSelector';
import type { ILangSelectorProps } from './LangSelector';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const render = (props: Partial<ILangSelectorProps> = {}) => {
  const allProps = {
    ...props,
  } as ILangSelectorProps;

  rtlRender(<LangSelector {...allProps} />);
};

it('fires onAddLang when add button is clicked', async () => {
  const handleAddLang = jest.fn();
  render({
    onAddLang: handleAddLang,
    options: [
      { label: 'bokmål', value: 'nb' },
      { label: 'engelsk', value: 'en' },
      { label: 'nordsamisk', value: 'se' },
    ],
  });

  const addBtn = screen.getByRole('button', {
    name: textMock('general.add'),
  });
  expect(addBtn).toBeDisabled();
  const select = screen.getByRole('combobox', {
    name: textMock('schema_editor.language_add_language'),
  });

  await act(() => user.type(select, 'nordsamisk'));
  await act(() => user.click(screen.getByText('nordsamisk')));

  expect(addBtn).not.toBeDisabled();
  await act(() => user.click(addBtn));

  expect(handleAddLang).toHaveBeenCalledWith('se');
});
