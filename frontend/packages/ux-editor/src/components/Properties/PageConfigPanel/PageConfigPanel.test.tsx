import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from '../../../testing/mocks';
import { PageConfigPanel } from './PageConfigPanel';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock, pagesModelMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { ItemType } from '../ItemType';

// Test data
const layoutSet = layoutSet1NameMock;
const duplicatedLayout = 'duplicatedLayout';
const dataModelName = undefined;

const defaultTexts: ITextResources = {
  [DEFAULT_LANGUAGE]: [
    { id: '1', value: 'Text 1' },
    { id: '2', value: 'Text 2' },
    { id: '3', value: 'Text 3' },
  ],
};
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
  [duplicatedLayout]: {
    components: {},
    containers: {},
    order: {
      ['idContainer']: ['idContainer1', 'idContainer2', 'idContainer3'],
      ['idContainer1']: ['idContainer', 'idContainer1', 'idContainer2'],
    },
    customRootProperties: {},
    customDataProperties: {},
  },
};

describe('PageConfigPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render heading with layout page name when layout is selected', async () => {
    const newSelectedPage = layout1NameMock;
    renderPageConfigPanel(newSelectedPage);
    screen.getByRole('heading', { name: newSelectedPage });
  });

  it('render all accordion items when layout is selected', async () => {
    const newSelectedPage = layout1NameMock;
    renderPageConfigPanel(newSelectedPage);
    screen.getByRole('button', { name: textMock('right_menu.text') });
    screen.getByRole('button', { name: textMock('right_menu.dynamics') });
  });

  it('render warning when layout is selected and has duplicated ids', () => {
    renderPageConfigPanel(duplicatedLayout);

    screen.getByRole('heading', { name: textMock('ux_editor.config.warning_duplicates.heading') });
  });

  it('should display duplicated ids in the document', () => {
    renderPageConfigPanel(duplicatedLayout);

    const duplicatedIds = screen.getByText(/<idcontainer1>, <idcontainer2>/i);
    expect(duplicatedIds).toBeInTheDocument();

    const uniqueIds = screen.queryByText(/<idcontainer>, <idContainer3>/i);
    expect(uniqueIds).not.toBeInTheDocument();
  });

  it('should show warning modal when there are duplicated ids across layouts', async () => {
    renderPageConfigPanel();
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
    jest.restoreAllMocks();
  });
});

const renderPageConfigPanel = (
  selectedLayoutName: string = layout1NameMock,
  textResources = defaultTexts,
) => {
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet], layouts);
  queryClientMock.setQueryData([QueryKey.Pages, org, app, layoutSet], pagesModelMock);
  queryClientMock.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, layoutSet],
    formLayoutSettingsMock,
  );
  queryClientMock.setQueryData(
    [QueryKey.DataModelMetadata, org, app, layoutSet, dataModelName],
    [],
  );

  const selectedItem: any = { type: ItemType.Page, id: selectedLayoutName };
  return renderWithProviders(<PageConfigPanel selectedItem={selectedItem} />, {
    appContextProps: {
      selectedItem,
    },
  });
};
