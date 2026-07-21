import { screen } from '@testing-library/react';
import { Elements } from './Elements';
import { renderWithProviders } from '../../testing/mocks';
import { StudioDragAndDropTree } from '@studio/components';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppContextProps } from '../../AppContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { UxEditorParams } from '../../hooks/useUxEditorParams';
import type { PreviewContextProps } from 'app-development/contexts/PreviewContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import { app as appId, layoutSet as layoutSetId, org as orgId } from '@studio/testing/testids';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import userEvent from '@testing-library/user-event';

const dataTaskLayoutSet: UiFolderLayoutSetModel = {
  id: layoutSetId,
  dataType: '',
  type: '',
  taskType: 'data',
};

const seedLayoutSets = (layoutSets: UiFolderLayoutSetModel[]): QueryClient => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, orgId, appId], layoutSets);
  return queryClient;
};

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

  it('should render conf page toolbar when selectedLayoutSet is CustomReceipt', () => {
    const queryClient = seedLayoutSets([
      { id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT, dataType: '', type: '' },
    ]);
    renderElements({}, {}, queryClient, undefined, {
      layoutSet: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    });

    expect(
      screen.queryByText(textMock('ux_editor.collapsable_standard_components')),
    ).not.toBeInTheDocument();

    const headerComponent = screen.getAllByText(textMock('ux_editor.component_title.Header'));
    expect(headerComponent[0]).toBeInTheDocument();
  });

  it('should render conf page toolbar when task type is payment', () => {
    const queryClient = seedLayoutSets([
      { id: layoutSetId, dataType: '', type: '', taskType: 'payment' },
    ]);
    renderElements({}, {}, queryClient);

    const paymentComponent = screen.getAllByText(textMock('ux_editor.component_title.Payment'));
    expect(paymentComponent[0]).toBeInTheDocument();
  });

  it('should collapse element when collapse button is clicked', async () => {
    const user = userEvent.setup();
    const view = renderElements();
    const collapseButton = screen.getByRole('button', {
      name: textMock('left_menu.close_components'),
    });
    await user.click(collapseButton);
    expect(collapseToggle).toHaveBeenCalled();

    view.rerender(<Elements collapsed={true} onCollapseToggle={collapseToggle} />);
    expect(collapseButton).not.toBeInTheDocument();
    const openButton = screen.getByRole('button', {
      name: textMock('left_menu.open_components'),
    });
    await user.click(openButton);
    expect(collapseToggle).toHaveBeenCalledTimes(2);
  });
});

const collapseToggle = jest.fn();
const renderElements = (
  appContextProps?: Partial<AppContextProps>,
  queries?: Partial<ServicesContextProps>,
  queryClient: QueryClient = seedLayoutSets([dataTaskLayoutSet]),
  previewContextProps?: Partial<PreviewContextProps>,
  uxEditorParams?: UxEditorParams,
) => {
  return renderWithProviders(
    <StudioDragAndDropTree.Provider rootId='test' onAdd={jest.fn()} onMove={jest.fn()}>
      <Elements collapsed={false} onCollapseToggle={collapseToggle} />
    </StudioDragAndDropTree.Provider>,
    {
      appContextProps,
      queries,
      queryClient,
      previewContextProps,
      uxEditorParams,
    },
  );
};
