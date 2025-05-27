import React from 'react';
import { Properties } from './Properties';
import { screen } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { IFormLayouts } from '../../types/global';
import { layout1NameMock } from 'app-shared/hooks/useSelectedTaskId.test';
import { layoutMock } from '../../testing/layoutMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { SelectedItem } from '../../AppContext';
import { ItemType } from './ItemType';

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Page config', () => {
    it('shows empty content message when selectedItem is undefined', () => {
      renderProperties({ selectedItem: undefined });
      const pageConfigPanel = screen.getByRole('heading', {
        name: textMock('right_menu.content_empty'),
      });
      expect(pageConfigPanel).toBeInTheDocument();
    });

    it('shows page config when selectedItem is a page', () => {
      renderProperties({ selectedItem: { type: ItemType.Page, id: layout1NameMock } });
      const pageConfigPanel = screen.getByTestId('pageConfigPanel');
      expect(pageConfigPanel).toBeInTheDocument();
    });

    it('shows group config when selectedItem is a group', () => {
      renderProperties({ selectedItem: { type: ItemType.Group, id: '' } });
      const pageConfigPanel = screen.getByTestId('groupConfigPanel');
      expect(pageConfigPanel).toBeInTheDocument();
    });

    it('shows component config when selectedItem is a component', () => {
      renderProperties({ selectedItem: { type: ItemType.Component, id: 'test-component' } });
      const pageConfigPanel = screen.getByTestId('properties-root');
      expect(pageConfigPanel).toBeInTheDocument();
    });
  });
});

const renderProperties = ({ selectedItem }: { selectedItem: SelectedItem }) => {
  const queryClientMock = createQueryClientMock();

  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClientMock.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, layoutSet1NameMock],
    formLayoutSettingsMock,
  );

  return renderWithProviders(<Properties />, {
    queryClient: queryClientMock,
    appContextProps: {
      selectedItem,
    },
  });
};
