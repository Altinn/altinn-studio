import React from 'react';

import { jest } from '@jest/globals';
import { screen } from '@testing-library/react';
import type { AxiosResponse } from 'axios';

import { AllOptionsProvider } from 'src/features/options/useAllOptions';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IRawOption } from 'src/layout/common.generated';

type RenderProps = {
  fetchOptions: () => Promise<AxiosResponse<IRawOption[], any>>;
};

async function render({ fetchOptions }: RenderProps) {
  return renderWithInstanceAndLayout({
    renderer: () => <AllOptionsProvider />,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [
              {
                type: 'Dropdown',
                id: 'myComponent',
                dataModelBindings: {
                  simpleBinding: 'data',
                },
                textResourceBindings: {
                  title: 'title',
                },
                optionsId: 'myOptions',
              },
            ],
          },
        },
      }),
      fetchFormData: async () => ({
        data: '',
      }),
      fetchOptions,
    },
  });
}

describe('useAllOptions', () => {
  beforeEach(() => {
    jest.spyOn(window, 'logErrorOnce').mockRestore();
  });

  it('should show unknown error if option fetching fails', async () => {
    const spy = jest
      .spyOn(window, 'logErrorOnce')
      .mockImplementation(() => {})
      .mockName('window.logErrorOnce');
    const view = render({ fetchOptions: async () => Promise.reject() });

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    await view;

    expect(screen.getByRole('heading', { level: 1, name: 'Ukjent feil' })).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/failed to fetch options for node mycomponent/i));
  });

  it('should finish loading if options are fetched', async () => {
    const spy = jest.spyOn(window, 'logErrorOnce').mockName('window.logErrorOnce');
    const view = render({ fetchOptions: async () => Promise.resolve({ data: [], headers: {} } as AxiosResponse) });

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    await view;

    expect(screen.queryByRole('heading', { level: 1, name: 'Ukjent feil' })).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});
