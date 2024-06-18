import React, { act } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../testing/mocks';
import { PageConfigPanel } from './PageConfigPanel';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { findLayoutsContainingDuplicateComponents } from '../../../utils/formLayoutUtils';

jest.mock('../../../utils/formLayoutUtils', () => ({
  ...jest.requireActual('../../../utils/formLayoutUtils'),
  findLayoutsContainingDuplicateComponents: jest.fn(),
}));

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
    (findLayoutsContainingDuplicateComponents as jest.Mock).mockReturnValue([]);
  });
  it('render heading with "no selected page" message when selected layout is "default"', async () => {
    renderPageConfigPanel();
    screen.getByRole('heading', { name: textMock('right_menu.content_empty') });
  });

  it('render heading with "no selected page" message when selected layout is undefined', () => {
    renderPageConfigPanel(undefined);
    screen.getByRole('heading', { name: textMock('right_menu.content_empty') });
  });

  it('render heading with layout page name when layout is selected', () => {
    const newSelectedPage = 'newSelectedPage';
    renderPageConfigPanel(newSelectedPage);
    screen.getByRole('heading', { name: newSelectedPage });
  });

  it('render all accordion items when layout is selected', () => {
    const newSelectedPage = 'newSelectedPage';
    renderPageConfigPanel(newSelectedPage);
    screen.getByRole('button', { name: textMock('right_menu.text') });
    screen.getByRole('button', { name: textMock('right_menu.dynamics') });
  });

  it('render textValue instead of page ID if page ID exists in the text resources', () => {
    const newSelectedPage = 'newSelectedPage';
    const newVisualPageName = 'newVisualPageName';
    renderPageConfigPanel(newSelectedPage, {
      [DEFAULT_LANGUAGE]: [{ id: newSelectedPage, value: newVisualPageName }],
    });
    expect(screen.queryByRole('heading', { name: newSelectedPage })).not.toBeInTheDocument();
    screen.getByRole('heading', { name: newVisualPageName });
    screen.getByRole('button', { name: textMock('ux_editor.id_identifier') });
  });

  it('render warning when layout is selected and has duplicated ids', async () => {
    await waitFor(async () => {
      renderPageConfigPanel(duplicatedLayout);
    });
    screen.getByRole('heading', { name: textMock('ux_editor.config.warning_duplicates.heading') });
  });

  it('should display duplicated ids in the document', async () => {
    await waitFor(async () => {
      renderPageConfigPanel(duplicatedLayout);
    });

    const duplicatedIds = screen.getByText(/<idcontainer1>, <idcontainer2>/i);
    expect(duplicatedIds).toBeInTheDocument();

    const uniqueIds = screen.queryByText(/<idcontainer>, <idContainer3>/i);
    expect(uniqueIds).not.toBeInTheDocument();
  });

  it('should show warning modal when there are duplicated ids in all layouts', async () => {
    await waitFor(async () => {
      renderPageConfigPanel();
    });

    const modal = screen.getByRole('dialog', { hidden: true });
    expect(modal).toBeInTheDocument();
  });
});

const renderPageConfigPanel = (
  selectedLayoutName: string = DEFAULT_SELECTED_LAYOUT_NAME,
  textResources = defaultTexts,
) => {
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet], layouts);
  queryClientMock.setQueryData(
    [QueryKey.DataModelMetadata, org, app, layoutSet, dataModelName],
    [],
  );

  return renderWithProviders(<PageConfigPanel />, {
    appContextProps: { selectedFormLayoutName: selectedLayoutName },
  });
};
