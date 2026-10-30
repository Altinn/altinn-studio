import React from 'react';

import { screen } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { RenderGrid } from 'src/layout/Grid/GridComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompExternalExact } from 'src/layout/layout';

describe('GridComponent', () => {
  const render = async (hiddenValue: unknown) =>
    await renderGenericComponentTest({
      type: 'Grid',
      renderer: (props) => <RenderGrid {...props} />,
      component: {
        rows: [
          {
            header: true,
            readOnly: false,
            cells: [
              { text: 'accordion.title' },
              {
                text: 'FormLayout',
                columnOptions: { hidden: hiddenValue },
              },
            ],
          },
          {
            header: false,
            readOnly: false,
            cells: [{ text: 'accordion.title' }, { text: 'FormLayout' }],
          },
        ],
      } as CompExternalExact<'Grid'>,
    });

  it('hides a column when header cell hidden evaluates to true', async () => {
    await render(true);
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(1);

    const titleOccurrences = screen.getAllByText('This is a title');
    expect(titleOccurrences).toHaveLength(2);
    expect(screen.queryByText('This is a page title')).not.toBeInTheDocument();

    const bodyCells = screen.getAllByRole('cell');
    expect(bodyCells).toHaveLength(1);
    expect(screen.getAllByText('This is a title')[0]).toBeInTheDocument();
  });

  it('does not hide a column when hidden evaluates to false', async () => {
    await render(false);

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);

    const titleOccurrences = screen.getAllByText('This is a title');
    expect(titleOccurrences.length).toBeGreaterThanOrEqual(1);
    const pageTitleOccurrences = screen.getAllByText('This is a page title');
    expect(pageTitleOccurrences.length).toBeGreaterThanOrEqual(1);
  });

  it('applies colSpan from cellStyle in text cells', async () => {
    await renderGenericComponentTest({
      type: 'Grid',
      renderer: (props) => <RenderGrid {...props} />,
      component: {
        rows: [
          {
            header: true,
            readOnly: false,
            cells: [
              {
                text: 'accordion.title',
                cellStyle: { colSpan: 2 },
              },
              { text: 'FormLayout' },
            ],
          },
        ],
      } as CompExternalExact<'Grid'>,
    });

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThanOrEqual(1);
    const firstHeaderCell = headers[0];
    expect(firstHeaderCell).toHaveAttribute('colspan', '2');
  });

  it('applies colSpan for component cells', async () => {
    await renderGenericComponentTest({
      type: 'Grid',
      renderer: (props) => <RenderGrid {...props} />,
      component: {
        rows: [
          {
            header: false,
            readOnly: false,
            cells: [
              {
                component: 'grid-text',
                cellStyle: {
                  colSpan: 3,
                },
              },
            ],
          },
        ],
      } as CompExternalExact<'Grid'>,
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = {
              FormLayout: {
                data: {
                  layout: [
                    {
                      id: 'my-test-component-id',
                      type: 'Grid',
                      rows: [
                        {
                          header: false,
                          readOnly: false,
                          cells: [
                            {
                              component: 'grid-text',
                              cellStyle: {
                                colSpan: 3,
                              },
                            },
                          ],
                        },
                      ],
                    },
                    {
                      id: 'grid-text',
                      type: 'Text',
                      value: '',
                      textResourceBindings: {
                        title: 'accordion.title',
                      },
                    },
                  ],
                },
              },
            };
          }),
      },
    });

    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThanOrEqual(1);
    const firstCell = cells[0];
    expect(firstCell).toHaveAttribute('colspan', '3');
  });
});
