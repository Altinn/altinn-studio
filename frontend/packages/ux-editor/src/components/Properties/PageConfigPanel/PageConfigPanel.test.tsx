import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testing/mocks';
import { PageConfigPanel } from './PageConfigPanel';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { ITextResources } from 'app-shared/types/global';
import { DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME } from 'app-shared/constants';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { formDesignerMock } from '../../../testing/stateMocks';
import type { IFormLayouts } from '../../../types/global';
import { layout1NameMock, layoutMock } from '../../../testing/layoutMock';

// Test data
const app = 'app';
const org = 'org';
const layoutSet = 'test-layout-set';

const defaultTexts: ITextResources = {
  [DEFAULT_LANGUAGE]: [
    { id: '1', value: 'Text 1' },
    { id: '2', value: 'Text 2' },
    { id: '3', value: 'Text 3' },
  ],
};
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

describe('PageConfigPanel', () => {
  it('render heading with "no selected page" message when selected layout is "default"', () => {
    renderPageConfigPanel();
    screen.getByRole('heading', { name: textMock('right_menu.content_empty') });
  });

  it('render heading with "no selected page" message when selected layout is undefined', () => {
    renderPageConfigPanel(undefined);
    screen.getByRole('heading', { name: textMock('right_menu.content_empty') });
  });

  it('render heading with layout page name when layout is selected', () => {
    const newSelectedPage = 'TESTPAGE';
    renderPageConfigPanel(newSelectedPage);
    screen.getByRole('heading', { name: newSelectedPage });
  });

  it('render all accordions when layout is selected', () => {
    const newSelectedPage = 'newSelectedPage';
    renderPageConfigPanel(newSelectedPage);
    screen.getByRole('button', { name: textMock('right_menu.text') });
    screen.getByRole('button', { name: textMock('right_menu.dynamics') });
  });

  it.each(['right_menu.text', 'right_menu.dynamics'])(
    'opens accordion with textKey, %s, when clicked',
    async (accordionTextKey: string) => {
      const user = userEvent.setup();
      const newSelectedPage = 'newSelectedPage';
      renderPageConfigPanel(newSelectedPage);
      const accordion = screen.getByRole('button', { name: textMock(accordionTextKey) });
      expect(accordion).toHaveAttribute('aria-expanded', 'false');
      await act(() => user.click(accordion));
      expect(accordion).toHaveAttribute('aria-expanded', 'true');
    },
  );

  it('opens and closes text accordion when double clicked', async () => {
    const user = userEvent.setup();
    const newSelectedPage = 'newSelectedPage';
    renderPageConfigPanel(newSelectedPage);
    const textAccordion = screen.getByRole('button', { name: textMock('right_menu.text') });
    expect(textAccordion).toHaveAttribute('aria-expanded', 'false');
    await act(() => user.click(textAccordion));
    expect(textAccordion).toHaveAttribute('aria-expanded', 'true');
    await act(() => user.click(textAccordion));
    expect(textAccordion).toHaveAttribute('aria-expanded', 'false');
  });

  it('render textValue instead of page ID if page ID exists in the text resources', () => {
    const newSelectedPage = 'newSelectedPage';
    const newVisualPageName = 'newVisualPageName';
    renderPageConfigPanel(newSelectedPage, {
      [DEFAULT_LANGUAGE]: [{ id: newSelectedPage, value: newVisualPageName }],
    });
    expect(screen.queryByRole('heading', { name: newSelectedPage })).not.toBeInTheDocument();
    screen.getByRole('heading', { name: newVisualPageName });
    screen.getByRole('button', { name: `ID: ${newSelectedPage}` });
  });
});

const renderPageConfigPanel = (
  selectedLayoutName: string = DEFAULT_SELECTED_LAYOUT_NAME,
  textResources = defaultTexts,
) => {
  queryClientMock.setQueryData([QueryKey.TextResources, org, app], textResources);
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSet], layouts);
  queryClientMock.setQueryData([QueryKey.DatamodelMetadata, org, app, layoutSet], []);
  return renderWithProviders(<PageConfigPanel />, {
    preloadedState: {
      formDesigner: {
        ...formDesignerMock,
        layout: {
          error: null,
          saving: false,
          unSavedChanges: false,
          selectedLayoutSet: layoutSet,
          selectedLayout: selectedLayoutName,
          invalidLayouts: [],
        },
      },
    },
  });
};
