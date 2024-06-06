import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { Elements } from './Elements';
import { renderWithProviders } from '../../testing/mocks';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppContextProps } from '../../AppContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

jest.mock('app-shared/hooks/useCustomReceiptLayoutSetName');
const mockUseCustomReceiptLayoutSetName = jest.mocked(useCustomReceiptLayoutSetName);

describe('Elements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render', () => {
    expect(renderElements()).toBeTruthy();
  });

  it('should render no components selected when selectedFormLayoutName is undefined', () => {
    renderElements({ selectedFormLayoutName: undefined });
    expect(screen.getByText(textMock('left_menu.no_components_selected'))).toBeInTheDocument();
  });

  it('should render no components selected when selectedFormLayoutName is default', () => {
    renderElements({ selectedFormLayoutName: 'default' });
    expect(screen.getByText(textMock('left_menu.no_components_selected'))).toBeInTheDocument();
  });

  it('should render components header', () => {
    renderElements();
    expect(screen.getByText(textMock('left_menu.components'))).toBeInTheDocument();
  });

  it('should render default toolbar when shouldShowConfPageToolbar is false', () => {
    renderElements({ selectedFormLayoutName: 'test' });
    expect(
      screen.getByText(textMock('ux_editor.collapsable_standard_components')),
    ).toBeInTheDocument();
  });

  it('should render conf page toolbar when selectedLayoutSet is CustomReceipt', async () => {
    mockUseCustomReceiptLayoutSetName.mockReturnValue('CustomReceipt');
    renderElements({ selectedFormLayoutSetName: 'CustomReceipt' });
    await waitForElementToBeRemoved(() =>
      screen.getByText(textMock('schema_editor.loading_available_components')),
    );

    expect(
      screen.queryByText(textMock('ux_editor.collapsable_standard_components')),
    ).not.toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.component_title.Header'))).toBeInTheDocument();
  });

  it('should render conf page toolbar when processTaskType is payment', async () => {
    const getProcessTaskType = jest.fn(() => Promise.resolve('payment'));
    renderElements({ selectedFormLayoutSetName: 'test' }, { getProcessTaskType });
    expect(
      await screen.findByText(textMock('ux_editor.component_title.Payment')),
    ).toBeInTheDocument();
  });

  it('should render loading spinner when fetching processTaskType', async () => {
    renderElements(
      { selectedFormLayoutSetName: 'test' },
      { getProcessTaskType: jest.fn(() => Promise.resolve('data')) },
      createQueryClientMock(),
    );

    expect(
      screen.getByText(textMock('schema_editor.loading_available_components')),
    ).toBeInTheDocument();
  });

  it('should render error message when processTaskType fetch fails', async () => {
    renderElements(
      { selectedFormLayoutSetName: 'test' },
      { getProcessTaskType: jest.fn(() => Promise.reject(new Error())) },
      createQueryClientMock(),
    );

    await waitForElementToBeRemoved(() =>
      screen.getByText(textMock('schema_editor.loading_available_components')),
    );
    expect(
      screen.getByText(
        textMock('schema_editor.error_could_not_detect_taskType', { layout: 'test' }),
      ),
    ).toBeInTheDocument();
  });
});

const renderElements = (
  appContextProps?: Partial<AppContextProps>,
  queries?: Partial<ServicesContextProps>,
  queryClient?: QueryClient,
) => {
  return renderWithProviders(
    <DragAndDropTree.Provider rootId='test' onAdd={jest.fn()} onMove={jest.fn()}>
      <Elements />
    </DragAndDropTree.Provider>,
    {
      appContextProps,
      queries,
      queryClient,
    },
  );
};
