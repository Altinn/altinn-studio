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
  it('renders component', async () => {
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
      expect(appContextMock.setSelectedFormLayoutSetName).toHaveBeenCalledTimes(1),
    );
    expect(appContextMock.refetchLayouts).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayouts).toHaveBeenCalledWith('test-layout-set-2');
    expect(appContextMock.refetchLayoutSettings).toHaveBeenCalledTimes(1);
    expect(appContextMock.refetchLayoutSettings).toHaveBeenCalledWith('test-layout-set-2');
    expect(appContextMock.onLayoutSetNameChange).toHaveBeenCalledWith('test-layout-set-2');
  });

  it('should render add and delete subform buttons when feature is enabled', async () => {
    addFeatureFlagToLocalStorage('subForm');

    render();
    const createSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.create.sub_form'),
    });
    expect(createSubFormButton).toBeInTheDocument();

    const deleteSubFormButton = screen.getByRole('button', {
      name: textMock('ux_editor.delete.sub_form'),
    });
    expect(deleteSubFormButton).toBeInTheDocument();
    removeFeatureFlagFromLocalStorage('subForm');
  });

  it('should not render add and delete subform buttons when feature is disabled', async () => {
    render();
    const createSubFormButton = screen.queryByRole('button', {
      name: textMock('ux_editor.create.sub_form'),
    });
    expect(createSubFormButton).not.toBeInTheDocument();

    const deleteSubFormButton = screen.queryByRole('button', {
      name: textMock('ux_editor.delete.sub_form'),
    });
    expect(deleteSubFormButton).not.toBeInTheDocument();
  });
});

const render = () => {
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  return renderWithProviders(<LayoutSetsContainer />);
};
