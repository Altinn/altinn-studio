import React from 'react';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { app, org } from '@studio/testing/testids';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';
import { EditLayoutSet } from './EditLayoutSet';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { layoutSets } from 'app-shared/mocks/mocks';

const handleComponentChange = jest.fn();
const subformLayoutSetId = 'subformLayoutSetId';
const subformLayoutSet = { sets: [{ id: subformLayoutSetId, type: 'subform' }] } as LayoutSets;

describe('EditLayoutSet', () => {
  afterEach(jest.clearAllMocks);

  it('should render the create subform card when no subforms are available', () => {
    renderEditLayoutSet();
    const header = screen.getByText(
      textMock('ux_editor.component_properties.subform.no_existing_layout_set_header'),
    );
    expect(header).toBeInTheDocument();
  });

  it('should render the select subform card when subforms are available', () => {
    renderEditLayoutSet(subformLayoutSet);
    const header = screen.getByText(
      textMock('ux_editor.component_properties.subform.choose_layout_set_header'),
    );
    expect(header).toBeInTheDocument();
  });

  it('should display create subform card when clicking create subform button', async () => {
    const user = userEvent.setup();
    renderEditLayoutSet(subformLayoutSet);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.create_layout_set_button'),
    });
    await user.click(createSubformButton);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should call handleComponentChange when save button is clicked', async () => {
    const user = userEvent.setup();
    renderEditLayoutSet(subformLayoutSet);

    const subformSelector = screen.getByRole('combobox', {
      name: textMock('ux_editor.component_properties.subform.choose_layout_set_label'),
    });
    await user.selectOptions(subformSelector, [subformLayoutSetId]);

    const saveButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.save_button'),
    });
    await user.click(saveButton);
    expect(handleComponentChange).toHaveBeenCalledTimes(1);
    expect(handleComponentChange).toHaveBeenCalledWith({
      ...componentMocks[ComponentType.Subform],
      layoutSet: subformLayoutSetId,
    });
  });

  it('should close create subform card when close button is clicked', async () => {
    const user = userEvent.setup();
    renderEditLayoutSet(subformLayoutSet);

    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.create_layout_set_button'),
    });
    await user.click(createSubformButton);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    const closeButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.create_cancel_button'),
    });
    await user.click(closeButton);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

const renderEditLayoutSet = (layoutSetsMock: LayoutSets = layoutSets) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);

  return renderWithProviders(
    <EditLayoutSet
      handleComponentChange={handleComponentChange}
      component={componentMocks[ComponentType.Subform]}
    />,
    { queryClient },
  );
};
