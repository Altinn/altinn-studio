import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { AppBuilderProvider } from '../../contexts/AppBuilderContext';
import type { AppBuilderData } from '../../contexts/AppBuilderContext';
import type { PageLayout } from '../../types';
import { PageList } from './PageList';
import type { PageListProps } from './PageList';

const org = 'org';
const app = 'app';
const emptyPage: PageLayout = { $schema: '', data: { layout: [] } };
const summaryPage: PageLayout = {
  $schema: '',
  data: { layout: [{ id: 'summary', type: ComponentType.Summary2 }] },
};

const defaultData: AppBuilderData = {
  org,
  app,
  layoutSetName: 'form',
  layoutSetNames: ['form'],
  layouts: { side1: emptyPage, side2: emptyPage },
  contentPageNames: ['side1', 'side2'],
  texts: { side1: 'Søknaden', side2: 'Barnet' },
};

const defaultProps: PageListProps = {
  selectedPageName: 'side1',
  onSelectPage: vi.fn(),
};

const getAddSummaryButton = (): HTMLElement | null =>
  screen.queryByRole('button', { name: textMock('app_builder.summary.add') });

describe('PageList', () => {
  it('lists the pages by their names', () => {
    renderPageList();
    expect(screen.getByRole('button', { name: /Søknaden/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: /Barnet/ })).toBeInTheDocument();
  });

  it('marks a page with a show rule as conditional, but not a page with hidden set to false', () => {
    const conditional: PageLayout = {
      $schema: '',
      // The layout type knows only some expressions, so a rule from the builder is cast.
      data: { layout: [], hidden: ['equals', ['component', 'type'], 'x'] as unknown as boolean },
    };
    const notHidden: PageLayout = { $schema: '', data: { layout: [], hidden: false } };
    renderPageList({ layouts: { side1: conditional, side2: notHidden } });
    expect(screen.getByRole('button', { name: /Søknaden/ })).toHaveTextContent(
      textMock('app_builder.page.conditional'),
    );
    expect(screen.getByRole('button', { name: /Barnet/ })).not.toHaveTextContent(
      textMock('app_builder.page.conditional'),
    );
  });

  it('adds a new page after the page the user is on', async () => {
    const user = userEvent.setup();
    const createPage = vi.fn().mockImplementation(() => Promise.resolve());
    const changePageOrder = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageList({}, { createPage, changePageOrder });

    await user.click(screen.getByRole('button', { name: textMock('app_builder.page.add') }));

    expect(createPage).toHaveBeenCalledWith(org, app, 'form', { id: 'side3' });
    expect(changePageOrder).toHaveBeenCalledWith(org, app, 'form', {
      pages: [{ id: 'side1' }, { id: 'side3' }, { id: 'side2' }],
    });
  });

  it('adds a summary page when the user asks for one', async () => {
    const user = userEvent.setup();
    const createPage = vi.fn().mockImplementation(() => Promise.resolve());
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const saveFormLayoutSettings = vi.fn().mockImplementation(() => Promise.resolve({}));
    renderPageList({}, { createPage, saveFormLayout, saveFormLayoutSettings });

    await user.click(getAddSummaryButton());

    expect(createPage).toHaveBeenCalledWith(org, app, 'form', { id: 'oppsummering' });
    const savedComponents = saveFormLayout.mock.calls[0][4].layout.data.layout;
    expect(savedComponents.map(({ type }) => type)).toContain(ComponentType.Summary2);
    await waitFor(() =>
      expect(saveFormLayoutSettings).toHaveBeenCalledWith(
        org,
        app,
        'form',
        expect.objectContaining({
          pages: expect.objectContaining({ excludeFromPdf: ['oppsummering'] }),
        }),
      ),
    );
  });

  it('does not offer a summary page when the app has one', () => {
    renderPageList({
      layouts: { side1: emptyPage, oppsummering: summaryPage },
      contentPageNames: ['side1'],
      summaryPageName: 'oppsummering',
    });
    expect(getAddSummaryButton()).not.toBeInTheDocument();
  });

  it('does not offer a summary page when a page in the middle sums up the answers', () => {
    renderPageList({
      layouts: { side1: summaryPage, side2: emptyPage },
      contentPageNames: ['side1', 'side2'],
    });
    expect(getAddSummaryButton()).not.toBeInTheDocument();
  });
});

function renderPageList(
  data: Partial<AppBuilderData> = {},
  services: Partial<ServicesContextProps> = {},
) {
  return render(
    <ServicesContextProvider {...queriesMock} {...services} client={createQueryClientMock()}>
      <AppBuilderProvider {...defaultData} {...data}>
        <PageList {...defaultProps} />
      </AppBuilderProvider>
    </ServicesContextProvider>,
  );
}
