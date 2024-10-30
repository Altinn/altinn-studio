import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutSetsContainer } from './LayoutSetsContainer';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../testing/mocks';
import {
  layoutSet1NameMock,
  layoutSet2NameMock,
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

    expect(await screen.findByRole('option', { name: layoutSetName1 })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: layoutSetName2 })).toBeInTheDocument();
  });

  it('Should update with selected layout', async () => {
    render();
    const user = userEvent.setup();
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);
    await user.click(screen.getByRole('option', { name: layoutSetName2 }));

    await waitFor(() =>
      expect(appContextMock.setSelectedformLayoutSetName).toHaveBeenCalledTimes(1),
    );
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutsForPreview).toHaveBeenCalledWith('test-layout-set-2');
    expect(appContextMock.updateLayoutSettingsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateLayoutSettingsForPreview).toHaveBeenCalledWith('test-layout-set-2');
    expect(appContextMock.onLayoutSetNameChange).toHaveBeenCalledWith('test-layout-set-2');
  });

  it('should render add and delete subform buttons when feature is enabled', () => {
    addFeatureFlagToLocalStorage('subform');

    render();
    const createSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.subform'),
    });
    expect(createSubformButton).toBeInTheDocument();

    const deleteSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).toBeInTheDocument();
    removeFeatureFlagFromLocalStorage('subform');
  });

  it('should not render add and delete subform buttons when feature is disabled', () => {
    render();
    const createSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.create.subform'),
    });
    expect(createSubformButton).not.toBeInTheDocument();

    const deleteSubformButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.subform'),
    });
    expect(deleteSubformButton).not.toBeInTheDocument();
  });
});

const render = () => {
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  return renderWithProviders(<LayoutSetsContainer />);
};
