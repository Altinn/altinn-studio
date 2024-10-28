import React from 'react';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { CreateNewSubformLayoutSet } from './CreateNewSubformLayoutSet';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layoutSets } from 'app-shared/mocks/mocks';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import userEvent from '@testing-library/user-event';
import type { FormComponent } from '../../../../../../types/FormComponent';
import { AppContext } from '../../../../../../AppContext';
import { appContextMock } from '../../../../../../testing/appContextMock';

const onSubFormCreatedMock = jest.fn();

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

  it('calls onSubFormCreated when save button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateNewSubformLayoutSet();
    const input = screen.getByRole('textbox');
    await user.type(input, 'NewSubForm');
    const saveButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(saveButton);
    await waitFor(() => expect(onSubFormCreatedMock).toHaveBeenCalledTimes(1));
    expect(onSubFormCreatedMock).toHaveBeenCalledWith('NewSubForm');
  });
});

const renderCreateNewSubformLayoutSet = (
  layoutSetsMock: LayoutSets = layoutSets,
  componentProps: Partial<FormComponent<ComponentType.Subform>> = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  return renderWithProviders(
    <AppContext.Provider value={{ ...appContextMock }}>
      <CreateNewSubformLayoutSet onSubFormCreated={onSubFormCreatedMock} {...componentProps} />
    </AppContext.Provider>,
    { queryClient },
  );
};
