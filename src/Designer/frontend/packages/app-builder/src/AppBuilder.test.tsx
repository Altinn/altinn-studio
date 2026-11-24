import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { AppBuilder } from './AppBuilder';

const layoutSets = [{ id: 'form', dataType: 'model', taskId: 'Task_1' }];
const failed = (): Promise<never> => Promise.reject(new Error('failed'));

describe('AppBuilder', () => {
  it('shows an error instead of the builder when the layout sets cannot be loaded', async () => {
    renderAppBuilder({ getLayoutSets: vi.fn(failed) });
    expect(await screen.findByText(textMock('app_builder.load_error'))).toBeInTheDocument();
  });

  it.each([
    'getFormLayouts',
    'getFormLayoutSettings',
    'getTextLanguages',
    'getOptionLists',
    'getDataModelsJson',
  ] as const)(
    'shows an error instead of the builder when %s fails, so nothing is saved over it',
    async (query) => {
      renderAppBuilder({
        getLayoutSets: vi.fn(() => Promise.resolve(layoutSets)),
        [query]: vi.fn(failed),
      });
      expect(await screen.findByText(textMock('app_builder.load_error'))).toBeInTheDocument();
    },
  );
});

function renderAppBuilder(services: Partial<ServicesContextProps>) {
  return render(
    <ServicesContextProvider {...queriesMock} {...services} client={createQueryClientMock()}>
      <AppBuilder org='org' app='app' />
    </ServicesContextProvider>,
  );
}
