import React from 'react';

import { screen } from '@testing-library/react';
import type { PageValidation } from '@app/layout-contract/generated/common.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { useEffectivePageValidation } from 'src/hooks/usePageValidation';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

type Pair = { validationOnNavigation?: PageValidation; validateOnBackToSummary?: PageValidation };

const required: PageValidation = { page: 'current', show: ['Required'] };
const schema: PageValidation = { page: 'current', show: ['Schema'] };
const optOut: PageValidation = { page: 'current', show: [] };

function Validations() {
  const { getPageValidation, getReturnValidation } = useEffectivePageValidation('edited');
  return (
    <>
      <div data-testid='next'>{JSON.stringify(getPageValidation() ?? null)}</div>
      <div data-testid='return'>{JSON.stringify(getReturnValidation() ?? null)}</div>
    </>
  );
}

async function render({ page = {}, task = {}, app = {} }: { page?: Pair; task?: Pair; app?: Pair }) {
  window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
    ui.folders.Task_1.pages = { order: ['edited'], ...task };
    ui.settings = { ...ui.settings, ...app };
  });

  await renderWithInstanceAndLayout({
    renderer: <Validations />,
    initialPage: 'edited',
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = { edited: { data: { layout: [], ...page } } };
        }),
    },
  });

  return {
    next: JSON.parse(screen.getByTestId('next').textContent ?? 'null'),
    back: JSON.parse(screen.getByTestId('return').textContent ?? 'null'),
  };
}

describe('useEffectivePageValidation', () => {
  it('lets task Next validation win over an app return default', async () => {
    // Merging the task and app settings first would pick the app's return setting here.
    const { back } = await render({
      task: { validationOnNavigation: required },
      app: { validateOnBackToSummary: optOut },
    });
    expect(back).toEqual(required);
  });

  it('lets page Next validation win over a task return default', async () => {
    const { back } = await render({
      page: { validationOnNavigation: required },
      task: { validateOnBackToSummary: optOut },
    });
    expect(back).toEqual(required);
  });

  it('prefers the return setting over Next validation on the same level', async () => {
    const { back } = await render({
      page: { validateOnBackToSummary: schema, validationOnNavigation: required },
      task: { validateOnBackToSummary: optOut },
    });
    expect(back).toEqual(schema);
  });

  it('falls back to app Next validation', async () => {
    const { back } = await render({ app: { validationOnNavigation: required } });
    expect(back).toEqual(required);
  });

  it('does not validate returns without any configuration', async () => {
    const { back } = await render({});
    expect(back).toBeNull();
  });

  it('ignores return settings for Next', async () => {
    const { next } = await render({
      page: { validateOnBackToSummary: optOut },
      task: { validateOnBackToSummary: optOut },
      app: { validationOnNavigation: schema },
    });
    expect(next).toEqual(schema);
  });
});
