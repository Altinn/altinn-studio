import React from 'react';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { EditLayoutSetForSubForm } from '@altinn/ux-editor/components/config/editModal/EditLayoutSetForSubFrom/EditLayoutSetForSubForm';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen, within } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layoutSets } from 'app-shared/mocks/mocks';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import userEvent from '@testing-library/user-event';
import type { FormComponent } from '@altinn/ux-editor/types/FormComponent';
import { AppContext } from '@altinn/ux-editor/AppContext';
import { appContextMock } from '@altinn/ux-editor/testing/appContextMock';

const handleComponentChangeMock = jest.fn();
const setSelectedFormLayoutSetMock = jest.fn();

describe('EditLayoutSetForSubForm', () => {
  afterEach(jest.clearAllMocks);

  it('displays "no existing subform layout sets" message if no subform layout set exist', () => {
    renderEditLayoutSetForSubForm();
    const noExistingSubFormForLayoutSet = screen.getByText(
      textMock('ux_editor.component_properties.subform.no_layout_sets_acting_as_subform'),
    );
    expect(noExistingSubFormForLayoutSet).toBeInTheDocument();
  });

  it('displays a button to set subform if subform layout sets exists', () => {
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm({ sets: [{ id: subFormLayoutSetId, type: 'subform' }] });
    const existingLayoutSetButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set'),
    });
    expect(existingLayoutSetButton).toBeInTheDocument();
  });

  it('does not display redirect button to design layout set for the subform if layout set is not set', () => {
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm({ sets: [{ id: subFormLayoutSetId, type: 'subform' }] });
    const redirectBoxHeading = screen.queryByRole('heading', {
      name: textMock('ux_editor.component_properties.subform.go_to_layout_set'),
    });
    expect(redirectBoxHeading).not.toBeInTheDocument();
  });

  it('displays a select to choose a layout set for the subform when clicking button to set', async () => {
    const user = userEvent.setup();
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm({ sets: [{ id: subFormLayoutSetId, type: 'subform' }] });
    const existingLayoutSetButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set'),
    });
    await user.click(existingLayoutSetButton);
    const selectLayoutSet = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set_label'),
    });
    const options = within(selectLayoutSet).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent(
      textMock('ux_editor.component_properties.subform.choose_layout_set'),
    );
    expect(options[1]).toHaveTextContent(subFormLayoutSetId);
  });

  it('calls handleComponentChange when setting a layout set for the subform', async () => {
    const user = userEvent.setup();
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm({ sets: [{ id: subFormLayoutSetId, type: 'subform' }] });
    const existingLayoutSetButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set'),
    });
    await user.click(existingLayoutSetButton);
    const selectLayoutSet = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set_label'),
    });
    await user.selectOptions(selectLayoutSet, subFormLayoutSetId);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        layoutSet: subFormLayoutSetId,
      }),
    );
  });

  it('calls handleComponentChange with no layout set for component if selecting the empty option', async () => {
    const user = userEvent.setup();
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm({ sets: [{ id: subFormLayoutSetId, type: 'subform' }] });
    const existingLayoutSetButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set'),
    });
    await user.click(existingLayoutSetButton);
    const selectLayoutSet = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set_label'),
    });
    const emptyOptionText = textMock('ux_editor.component_properties.subform.choose_layout_set');
    await user.selectOptions(selectLayoutSet, emptyOptionText);
    expect(handleComponentChangeMock).toHaveBeenCalledTimes(1);
    expect(handleComponentChangeMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        layoutSet: expect.anything(),
      }),
    );
  });

  it('displays a button with the existing layout set for the subform if set', () => {
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm(
      { sets: [{ id: subFormLayoutSetId, type: 'subform' }] },
      { layoutSet: subFormLayoutSetId },
    );
    const existingLayoutSetButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set'),
    });
    expect(existingLayoutSetButton).toBeInTheDocument();
  });

  it('displays a redirect button to design layout set for the subform if set', () => {
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm(
      { sets: [{ id: subFormLayoutSetId, type: 'subform' }] },
      { layoutSet: subFormLayoutSetId },
    );
    const redirectBoxTitle = screen.queryByText(
      textMock('ux_editor.component_properties.subform.go_to_layout_set'),
    );
    expect(redirectBoxTitle).toBeInTheDocument();
  });

  it('calls setSelectedFormLayoutSet when clicking the redirect button', async () => {
    const user = userEvent.setup();
    const subFormLayoutSetId = 'subFormLayoutSetId';
    renderEditLayoutSetForSubForm(
      { sets: [{ id: subFormLayoutSetId, type: 'subform' }] },
      { layoutSet: subFormLayoutSetId },
    );
    const redirectButton = screen.queryByRole('button', {
      name: textMock('top_menu.create'),
    });
    await user.click(redirectButton);
    expect(setSelectedFormLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(setSelectedFormLayoutSetMock).toHaveBeenCalledWith(subFormLayoutSetId);
  });
});

const renderEditLayoutSetForSubForm = (
  layoutSetsMock: LayoutSets = layoutSets,
  componentProps: Partial<FormComponent<ComponentType.SubForm>> = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  return renderWithProviders(
    <AppContext.Provider
      value={{ ...appContextMock, setSelectedFormLayoutSetName: setSelectedFormLayoutSetMock }}
    >
      <EditLayoutSetForSubForm
        component={{ ...componentMocks[ComponentType.SubForm], ...componentProps }}
        handleComponentChange={handleComponentChangeMock}
      />
    </AppContext.Provider>,
    { queryClient },
  );
};
