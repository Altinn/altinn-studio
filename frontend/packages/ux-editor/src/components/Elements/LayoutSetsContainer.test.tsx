import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../testing/mocks';
import {
  layoutSet1NameMock,
  layoutSet2NameMock,
  layoutSet3SubformNameMock,
  layoutSetsExtendedMock,
  layoutSetsMock,
} from '../../testing/layoutSetsMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { appContextMock } from '../../testing/appContextMock';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { LayoutSetsModel } from 'app-shared/types/api/dto/LayoutSetsModel';

// Test data
const layoutSetName1 = layoutSet1NameMock;
const layoutSetName2 = layoutSet2NameMock;

describe('LayoutSetsContainer', () => {
  it('should render the layout-sets as options within a combobox', async () => {
    const user = userEvent.setup();
    render();

    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    expect(
      await screen.findByRole('option', { name: new RegExp(layoutSetName1 + ' ') }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('option', { name: new RegExp(layoutSetName2 + ' ') }),
    ).toBeInTheDocument();
  });

  it('should not render combobox when there are no layoutSets', async () => {
    render({ layoutSets: null, layoutSetsExtended: null });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Should update with selected layout', async () => {
    render();
    const user = userEvent.setup();
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: new RegExp(layoutSetName2 + ' ') }));

    await waitFor(() =>
      expect(appContextMock.setSelectedFormLayoutSetName).toHaveBeenCalledTimes(1),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith('test-layout-set-2');
    expect(appContextMock.updateLayoutSettingsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutSettingsForPreview).toHaveBeenCalledWith('test-layout-set-2');
    expect(appContextMock.onLayoutSetNameChange).toHaveBeenCalledWith('test-layout-set-2');
  });

  it('should render the delete subform button when selected layoutset is a subform', () => {
    render({
      layoutSets: { sets: [{ id: layoutSet3SubformNameMock, type: 'subform' }] },
      selectedLayoutSet: layoutSet3SubformNameMock,
    });
    const deleteSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).toBeInTheDocument();
  });

  it('should not render the delete subform button when selected layoutset is not a subform', () => {
    render({
      layoutSets: { sets: [{ id: layoutSet1NameMock, dataType: 'data-model' }] },
      selectedLayoutSet: layoutSet1NameMock,
    });
    const deleteSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).not.toBeInTheDocument();
  });

  it('should not render the delete subform button when feature is disabled', () => {
    render();
    const deleteSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).not.toBeInTheDocument();
  });

  it('should render an error message if selectedFormLayoutSetName is not in layoutSets', async () => {
    render({ layoutSets: { sets: [] }, selectedLayoutSet: 'non-existing-layout-set' });
    const errorMessage = screen.getByText(textMock('general.fetch_error_message'));
    expect(errorMessage).toBeInTheDocument();
  });
});

type renderProps = {
  layoutSets?: LayoutSets;
  layoutSetsExtended?: LayoutSetsModel;
  selectedLayoutSet?: string;
};

const render = ({
  layoutSets = layoutSetsMock,
  layoutSetsExtended = layoutSetsExtendedMock,
  selectedLayoutSet = layoutSetName1,
}: renderProps = {}) => {
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSets);
  queryClientMock.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtended);
  appContextMock.selectedFormLayoutSetName = selectedLayoutSet;
  return renderWithProviders(<LayoutSetsContainer />);
};
