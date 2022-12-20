import React from 'react';
import { LanguageSelector } from './LanguageSelector';
import type { ILanguageSelectorProps } from './LanguageSelector';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

const render = (props: Partial<ILanguageSelectorProps> = {}) => {
  const allProps = {
    ...props,
  } as ILanguageSelectorProps;

  rtlRender(<LanguageSelector {...allProps} />);
};

it('fires onAddLanguage when add button is clicked', async () => {
  const handleAddLanguage = jest.fn();
  render({
    onAddLanguage: handleAddLanguage,
    options: [
      { label: 'bokmål', value: 'nb' },
      { label: 'engelsk', value: 'en' },
      { label: 'nordsamisk', value: 'se' },
    ],
  });

  const addBtn = screen.getByRole('button', {
    name: /legg til/i,
  });
  expect(addBtn).toBeDisabled();
  const select = screen.getByRole('combobox');

  await user.type(select, 'nordsamisk');
  await user.click(screen.getByText('nordsamisk'));

  expect(addBtn).not.toBeDisabled();
  await user.click(addBtn);

  expect(handleAddLanguage).toHaveBeenCalledWith('se');
});
