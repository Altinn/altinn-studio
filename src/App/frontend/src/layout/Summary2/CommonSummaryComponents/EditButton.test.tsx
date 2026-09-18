import React, { useState } from 'react';

import { fireEvent, screen } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { EditButton, EditButtonFirstVisibleAndEditable } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';

describe('EditButton', () => {
  const layoutMock = (readOnly = false): ILayoutCollection => ({
    FormLayout: {
      data: {
        layout: [
          {
            id: 'TestInput',
            type: 'Input',
            dataModelBindings: { simpleBinding: { field: 'field' } },
            textResourceBindings: {},
            readOnly,
          } as CompExternal,
        ],
      },
    },
  });

  test('should return null when component is readOnly', async () => {
    await renderWithInstanceAndLayout({
      renderer: <EditButton targetBaseComponentId='TestInput' />,
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = layoutMock(true);
          }),
      },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('should render edit button when component is not readOnly', async () => {
    await renderWithInstanceAndLayout({
      renderer: <EditButton targetBaseComponentId='TestInput' />,
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = layoutMock(false);
          }),
      },
    });

    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

it('remounts the fallback when its component id changes', async () => {
  function ChangingFallback() {
    const [fallback, setFallback] = useState<string>();
    return (
      <>
        <button onClick={() => setFallback((current) => (current ? undefined : 'TestInput'))}>Toggle fallback</button>
        <EditButtonFirstVisibleAndEditable
          ids={[]}
          fallback={fallback}
        />
      </>
    );
  }
  await renderWithInstanceAndLayout({
    renderer: <ChangingFallback />,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = {
            FormLayout: { data: { layout: [{ id: 'TestInput', type: 'Input', textResourceBindings: {} }] } },
          };
        }),
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Toggle fallback' }));
  expect(screen.getAllByRole('button')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Toggle fallback' }));
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
