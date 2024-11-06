import React from 'react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { CreateNewSubformLayoutSet } from './CreateNewSubformLayoutSet';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { layoutSets } from 'app-shared/mocks/mocks';
import userEvent from '@testing-library/user-event';
import { AppContext } from '../../../../../../AppContext';
import { appContextMock } from '../../../../../../testing/appContextMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const onSubformCreatedMock = jest.fn();

describe('CreateNewSubformLayoutSet ', () => {
  afterEach(jest.clearAllMocks);

  it('displays the card with label and input field', () => {
    renderCreateNewSubformLayoutSet();
    const card = screen.getByRole('textbox', {
      name: textMock('ux_editor.component_properties.subform.created_layout_set_name'),
    });

    expect(card).toBeInTheDocument();
  });

  it('displays the input field', () => {
    renderCreateNewSubformLayoutSet();
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('displays the save button', () => {
    renderCreateNewSubformLayoutSet();
    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(saveButton).toBeInTheDocument();
  });

  it('calls onSubformCreated when save button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();
    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');
    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(saveButton);
    expect(onSubformCreatedMock).toHaveBeenCalledTimes(1);
    expect(onSubformCreatedMock).toHaveBeenCalledWith('NewSubform');
  });

  it('displays loading spinner when save button is clicked', async () => {
    const user = userEvent.setup();

    const addLayoutSetMock = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(resolve, 100);
        }),
    );
    renderCreateNewSubformLayoutSet({
      addLayoutSet: addLayoutSetMock,
    });

    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubform');
    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(saveButton);
    const spinner = await screen.findByText(textMock('general.loading'));

    expect(spinner).toBeInTheDocument();
  });

  it('disables the save button when input is invalid', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();

    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    expect(saveButton).toBeDisabled();

    const input = screen.getByRole('textbox');

    await user.type(input, 'æøå');
    expect(saveButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'e re a');
    expect(saveButton).toBeDisabled();

    await user.clear(input);
    await user.type(input, 'NewSubform');
    expect(saveButton).not.toBeDisabled();
  });
});

const renderCreateNewSubformLayoutSet = (queries?: Partial<ServicesContextProps>) => {
  return renderWithProviders(
    <AppContext.Provider value={{ ...appContextMock }}>
      <CreateNewSubformLayoutSet onSubformCreated={onSubformCreatedMock} layoutSets={layoutSets} />
    </AppContext.Provider>,
    {
      queries: { ...queriesMock, ...queries },
      queryClient: createQueryClientMock(),
    },
  );
};
