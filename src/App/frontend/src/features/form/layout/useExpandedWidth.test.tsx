import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { useExpandedWidth } from 'src/features/form/layout/useExpandedWidth';
import { renderWithInstanceAndLayout, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

function Harness() {
  const { expandedWidth, toggleExpandedWidth } = useExpandedWidth();

  return (
    <>
      <div data-testid='expanded-width'>{JSON.stringify(expandedWidth)}</div>
      <button onClick={toggleExpandedWidth}>toggle</button>
    </>
  );
}

function expectWidth(expanded: boolean) {
  expect(screen.getByTestId('expanded-width')).toHaveTextContent(JSON.stringify(expanded));
}

async function toggle() {
  await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
}

interface RenderProps {
  expandedWidth?: boolean;
  showExpandWidthButton?: boolean;
  expandedWidthOnPage?: boolean;
}

async function render({ expandedWidth, showExpandWidthButton = true, expandedWidthOnPage }: RenderProps = {}) {
  window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
    ui.folders.Task_1 = {
      defaultDataType: defaultDataTypeMock,
      pages: {
        order: ['FormLayout'],
        expandedWidth,
        showExpandWidthButton,
      },
    };
  });

  await renderWithInstanceAndLayout({
    renderer: () => <Harness />,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = {
            FormLayout: {
              data: {
                layout: [],
                expandedWidth: expandedWidthOnPage,
              },
            },
          };
        }),
    },
  });
}

describe('useExpandedWidth', () => {
  describe('configured width', () => {
    it('defaults to not expanded', async () => {
      await render();
      expectWidth(false);
    });

    it('uses the width configured for the task', async () => {
      await render({ expandedWidth: true });
      expectWidth(true);
    });

    it('lets the page override the width configured for the task', async () => {
      await render({ expandedWidth: true, expandedWidthOnPage: false });
      expectWidth(false);
    });

    it('falls back to the task when no form is rendered', async () => {
      // Confirmation, feedback and waiting service tasks render outside FormProvider, so there is no
      // layout to override the width - and no store to blow up on.
      window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
        ui.settings = { ...ui.settings!, expandedWidth: true, showExpandWidthButton: false };
      });

      await renderWithoutInstanceAndLayout({ renderer: () => <Harness />, withFormProvider: false });
      expectWidth(true);
    });
  });

  describe('user preference', () => {
    it('overrides the configured width where the button is shown', async () => {
      await render({ expandedWidth: false, showExpandWidthButton: true });
      expectWidth(false);

      await toggle();
      expectWidth(true);
    });

    it('collapses a page that is configured as expanded', async () => {
      await render({ expandedWidth: true, showExpandWidthButton: true });

      await toggle();
      expectWidth(false);
    });

    it('is ignored where the button is not shown', async () => {
      await render({ expandedWidth: true, showExpandWidthButton: false });

      await toggle();
      expectWidth(true);
    });

    it('does not override a page-level width it was not asked about', async () => {
      // A page configured as expanded stays expanded until the user says otherwise.
      await render({ expandedWidth: false, expandedWidthOnPage: true, showExpandWidthButton: true });
      expectWidth(true);
    });
  });
});
