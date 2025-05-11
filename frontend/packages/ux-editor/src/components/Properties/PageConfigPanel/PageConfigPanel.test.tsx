import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { formLayoutSettingsMock, renderWithProviders } from '../../../testing/mocks';
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

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn(),
  FeatureFlag: {
    TaskNavigationPageGroups: 'TaskNavigationPageGroups',
  },
}));

const setupFeatureFlag = (enabled: boolean) => {
  const { shouldDisplayFeature } = require('app-shared/utils/featureToggleUtils');
  shouldDisplayFeature.mockReturnValue(enabled);
};

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
    screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_textResourceBindings_page_id'),
    });
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

  it('should not show warning modal when there are no duplicated ids across layouts', () => {
    renderPageConfigPanel();

    const modal = screen.queryByRole('dialog');

    expect(modal).not.toBeInTheDocument();
  });

  it('should show warning modal when there are duplicated ids across layouts', async () => {
    (findLayoutsContainingDuplicateComponents as jest.Mock).mockReturnValue({
      duplicateLayouts: [duplicatedLayout],
    });
    renderPageConfigPanel();
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('dispay not selected group message when TaskNavigationPageGroups feature is enabled and groups exist', () => {
    beforeEach(() => {
      setupFeatureFlag(true);
      queryClientMock.setQueryData([QueryKey.Pages, org, app, layoutSet], {
        groups: ['group1', 'group2'],
      });
    });

    it('renders selectedGroupName as heading when selectedGroupName is defined', () => {
      const selectedGroupName = 'myGroup';
      renderPageConfigPanel(layout1NameMock, defaultTexts, { selectedGroupName });
      screen.getByRole('heading', { name: selectedGroupName });
    });

    it('renders content_group_empty message as heading when selectedGroupName is undefined', () => {
      renderPageConfigPanel(layout1NameMock, defaultTexts, { selectedGroupName: undefined });
      screen.getByRole('heading', { name: textMock('right_menu.content_group_empty') });
    });
  });

  it('renders StudioAlert with content_group_message when groups exist', () => {
    queryClientMock.setQueryData([QueryKey.Pages, org, app, layoutSet], {
      groups: ['group1', 'group2'],
    });
    renderPageConfigPanel(layout1NameMock, defaultTexts);
    const alert = screen.getByText(textMock('right_menu.content_group_message'));
    expect(alert).toBeInTheDocument();
  });

  it('does not render StudioAlert when no groups exist', () => {
    queryClientMock.setQueryData([QueryKey.Pages, org, app, layoutSet], {
      groups: [],
    });
    renderPageConfigPanel(layout1NameMock, defaultTexts);
    const alert = screen.queryByRole('alert');
    expect(alert).not.toBeInTheDocument();
  });
});

const renderPageConfigPanel = (
  selectedLayoutName: string = DEFAULT_SELECTED_LAYOUT_NAME,
  textResources = defaultTexts,
  appContextProps = { selectedGroupName: undefined },
) => {
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet], layouts);
  queryClientMock.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, layoutSet],
    formLayoutSettingsMock,
  );
  queryClientMock.setQueryData(
    [QueryKey.DataModelMetadata, org, app, layoutSet, dataModelName],
    [],
  );

  return renderWithProviders(<PageConfigPanel />, {
    appContextProps: {
      selectedFormLayoutName: selectedLayoutName,
      selectedFormLayoutSetName: layoutSet,
      ...appContextProps,
    },
  });
};
