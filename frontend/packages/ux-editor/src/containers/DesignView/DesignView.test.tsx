import React from 'react';
import { formLayoutSettingsMock, renderWithProviders } from '../../testing/mocks';
import { DesignView } from './DesignView';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FormItemContextProvider } from '../FormItemContext';
import { StudioDragAndDrop } from '@studio/components-legacy';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  externalLayoutsMock,
  groupsPagesModelMock,
  layout1Mock,
  layout1NameMock,
  layout2NameMock,
  pagesModelMock,
} from '../../testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { appContextMock } from '../../testing/appContextMock';
import { app, org } from '@studio/testing/testids';
import type { ILayoutSettings } from 'app-shared/types/global';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import { AppContext } from '@altinn/ux-editor/AppContext';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn(),
  FeatureFlag: {
    TaskNavigationPageGroups: 'TaskNavigationPageGroups',
  },
}));

const mockSelectedLayoutSet = layoutSet1NameMock;
const mockPageName1: string = layout1NameMock;
const mockPageName2: string = layout2NameMock;

const setupFeatureFlag = (enabled: boolean) => {
  const { shouldDisplayFeature } = require('app-shared/utils/featureToggleUtils');
  shouldDisplayFeature.mockReturnValue(enabled);
};

describe('DesignView', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays the correct number of accordions', () => {
    renderDesignView({});

    formLayoutSettingsMock.pages.order.forEach((page) => {
      const accordionButton = screen.getByRole('button', { name: page });
      expect(accordionButton).toBeInTheDocument();
    });
  });

  it('adds page with correct name', async () => {
    const user = userEvent.setup();
    renderDesignView({
      layoutSettings: {
        ...formLayoutSettingsMock,
        pages: { order: ['someName', 'someOtherName'] },
      },
      pagesModel: {
        pages: [{ id: 'someName' }, { id: 'someOtherName' }],
      },
    });
    const addButton = screen.getByRole('button', { name: textMock('ux_editor.pages_add') });
    await user.click(addButton);
    expect(queriesMock.createPage).toHaveBeenCalledWith(org, app, mockSelectedLayoutSet, {
      id: `${textMock('ux_editor.page')}${3}`,
    });
  });

  it('increments the page name for the new page if pdfLayoutName has the next incremental page name', async () => {
    const user = userEvent.setup();
    setupFeatureFlag(false);
    const pdfLayoutName = `${textMock('ux_editor.page')}${3}`;
    renderDesignView({
      layoutSettings: {
        ...formLayoutSettingsMock,
        pages: {
          order: [`${textMock('ux_editor.page')}${1}`, `${textMock('ux_editor.page')}${2}`],
          pdfLayoutName,
        },
      },
      externalLayout: { [pdfLayoutName]: layout1Mock },
      pagesModel: {
        pages: [
          { id: `${textMock('ux_editor.page')}${1}` },
          { id: `${textMock('ux_editor.page')}${2}` },
        ],
        groups: [],
      },
    });
    const addButton = screen.getByRole('button', { name: textMock('ux_editor.pages_add') });
    await user.click(addButton);
    expect(queriesMock.createPage).toHaveBeenCalledWith(org, app, mockSelectedLayoutSet, {
      id: `${textMock('ux_editor.page')}${4}`,
    });
  });

  it('calls "setSelectedFormLayoutName" with undefined when current page the accordion is clicked', async () => {
    const user = userEvent.setup();
    renderDesignView({});

    const accordionButton1 = screen.getByRole('button', { name: mockPageName1 });
    await user.click(accordionButton1);

    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledTimes(1);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledWith(undefined);
  });

  it('calls "setSelectedFormLayoutName" with the new page when another page accordion is clicked', async () => {
    const user = userEvent.setup();
    renderDesignView({});

    const accordionButton2 = screen.getByRole('button', { name: mockPageName2 });
    await user.click(accordionButton2);

    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledTimes(1);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledWith(mockPageName2);
  });

  it('calls "saveFormLayout" when add page is clicked', async () => {
    const user = userEvent.setup();
    renderDesignView({
      layoutSettings: {
        ...formLayoutSettingsMock,
        pages: { order: [mockPageName1, mockPageName2] },
      },
      pagesModel: {
        pages: [{ id: mockPageName1 }, { id: mockPageName2 }],
      },
    });
    const addButton = screen.getByRole('button', { name: textMock('ux_editor.pages_add') });
    await user.click(addButton);
    expect(queriesMock.createPage).toHaveBeenCalled();
  });

  it('Displays the tree view version of the layout', () => {
    renderDesignView({});
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('Renders the page accordion as a pdfAccordion when pdfLayoutName is set', () => {
    const pdfLayoutName = 'pdfLayoutName';
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderDesignView({
      layoutSettings: { ...formLayoutSettingsMock, pages: { order: [], pdfLayoutName } },
      externalLayout: { [pdfLayoutName]: layout1Mock },
    });
    const pdfAccordionButton = screen.getByRole('button', { name: pdfLayoutName });
    expect(pdfAccordionButton).toBeInTheDocument();
    consoleWarnSpy.mockRestore();
  });

  it('renders DesignViewNavigation when isTaskNavigationPageGroups is true', () => {
    setupFeatureFlag(true);
    renderDesignView({});
    expect(screen.getByTestId('design-view-navigation')).toBeInTheDocument();
  });

  it('does not render DesignViewNavigation when isTaskNavigationPageGroups is false', () => {
    setupFeatureFlag(false);
    renderDesignView({});
    expect(screen.queryByTestId('design-view-navigation')).not.toBeInTheDocument();
  });

  it('does not render Accordion when pagesModel has no pages', () => {
    setupFeatureFlag(false);
    renderDesignView({ layoutSettings: { ...formLayoutSettingsMock, pages: { order: [] } } });
    const accordion = screen.queryByRole('group', { name: /accordion/i });
    expect(accordion).not.toBeInTheDocument();
  });

  it('renders page accordions when isTaskNavigationPageGroups is false', () => {
    setupFeatureFlag(false);
    renderDesignView({});
    formLayoutSettingsMock.pages.order.forEach((page) => {
      expect(screen.getByRole('button', { name: page })).toBeInTheDocument();
    });
  });

  it('Does not render group accordions when order is empty or undefined', () => {
    setupFeatureFlag(true);
    renderDesignView({
      layoutSettings: {
        ...formLayoutSettingsMock,
        pages: { order: [], pdfLayoutName: undefined },
      },
    });
    expect(screen.queryByText('Sideoppsett 1')).not.toBeInTheDocument();
    expect(screen.queryByText('EmptyGroup')).not.toBeInTheDocument();
  });

  it('calls handleAddGroup and triggers addGroupMutation correctly', async () => {
    const user = userEvent.setup();
    setupFeatureFlag(true);
    const updateLayoutsForPreviewMock = jest.fn().mockResolvedValue(undefined);
    appContextMock.updateLayoutsForPreview = updateLayoutsForPreviewMock;
    renderDesignView({ pagesModel: groupsPagesModelMock });
    const addGroupButton = screen.getByRole('button', { name: textMock('ux_editor.groups.add') });
    expect(addGroupButton).toBeInTheDocument();
    await user.click(addGroupButton);
    expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
  });

  it('calls "setSelectedFormLayoutName" with page name when clicking a closed accordion in a group', async () => {
    const user = userEvent.setup();
    setupFeatureFlag(true);
    appContextMock.selectedFormLayoutName = layout2NameMock;
    renderDesignView({ pagesModel: groupsPagesModelMock });
    expect(screen.getByText('Sideoppsett 1')).toBeInTheDocument();
    const accordionButton = screen.getByRole('button', { name: layout1NameMock });
    await user.click(accordionButton);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledTimes(1);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledWith(layout1NameMock);
  });

  it('calls "setSelectedFormLayoutName" with undefined when clicking an open accordion in a group', async () => {
    const user = userEvent.setup();
    setupFeatureFlag(true);
    appContextMock.selectedFormLayoutName = layout1NameMock;
    renderDesignView({ pagesModel: groupsPagesModelMock });
    expect(screen.getByText('Sideoppsett 1')).toBeInTheDocument();
    const accordionButton = screen.getByRole('button', { name: layout1NameMock });
    await user.click(accordionButton);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledTimes(1);
    expect(appContextMock.setSelectedFormLayoutName).toHaveBeenCalledWith(undefined);
  });
});

type renderDesignViewParams = {
  layoutSettings?: ILayoutSettings;
  externalLayout?: FormLayoutsResponse;
  pagesModel?: PagesModel;
};

const renderDesignView = ({
  layoutSettings = formLayoutSettingsMock,
  externalLayout = externalLayoutsMock,
  pagesModel = pagesModelMock,
}: renderDesignViewParams) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, mockSelectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayout),
  );
  queryClient.setQueryData([QueryKey.Pages, org, app, mockSelectedLayoutSet], pagesModel);
  queryClient.setQueryData(
    [QueryKey.FormLayoutSettings, org, app, mockSelectedLayoutSet],
    layoutSettings,
  );

  const appContextWithGroupsMock = {
    ...appContextMock,
    setSelectedGroupName: jest.fn(),
  };

  return renderWithProviders(
    <StudioDragAndDrop.Provider rootId={BASE_CONTAINER_ID} onMove={jest.fn()} onAdd={jest.fn()}>
      <FormItemContextProvider>
        <AppContext.Provider value={appContextWithGroupsMock}>
          <DesignView />
        </AppContext.Provider>
      </FormItemContextProvider>
    </StudioDragAndDrop.Provider>,
    {
      queryClient,
    },
  );
};
