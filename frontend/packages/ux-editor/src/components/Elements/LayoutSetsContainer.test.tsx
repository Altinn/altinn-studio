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
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
} from 'app-shared/utils/featureToggleUtils';
import { textMock } from '@studio/testing/mocks/i18nMock';

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
    render({ sets: null });
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

  it('should render the delete subform button when feature is enabled and selected layoutset is a subform', () => {
    addFeatureFlagToLocalStorage('subform');
    render(
      { sets: [{ id: layoutSet3SubformNameMock, type: 'subform' }] },
      { selectedlayoutSet: layoutSet3SubformNameMock },
    );
    const deleteSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).toBeInTheDocument();
    removeFeatureFlagFromLocalStorage('subform');
  });

  it('should not render the delete subform button when feature is enabled and selected layoutset is not a subform', () => {
    addFeatureFlagToLocalStorage('subform');
    render(
      { sets: [{ id: layoutSet1NameMock, dataType: 'data-model' }] },
      { selectedlayoutSet: layoutSet1NameMock },
    );
    const deleteSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).not.toBeInTheDocument();
    removeFeatureFlagFromLocalStorage('subform');
  });

  it('should not render the delete subform button when feature is disabled', () => {
    render();
    const deleteSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).not.toBeInTheDocument();
  });
});

const render = (layoutSetsData = layoutSetsMock, options: { selectedlayoutSet?: string } = {}) => {
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsData);
  appContextMock.selectedFormLayoutSetName = options.selectedlayoutSet || layoutSetName1;
  queryClientMock.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  return renderWithProviders(<LayoutSetsContainer />);
};
