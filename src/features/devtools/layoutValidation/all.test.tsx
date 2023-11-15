import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import type { JSONSchema7 } from 'json-schema';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import {
  LayoutValidationProvider,
  useLayoutValidation,
} from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { ensureAppsDirIsSet, getAllLayoutSets } from 'src/test/allApps';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import { isStatelessApp } from 'src/utils/appMetadata';

describe('All known apps should work with layout validation', () => {
  const dir = ensureAppsDirIsSet();
  if (!dir) {
    return;
  }

  const layoutSchema = JSON.parse(fs.readFileSync('schemas/json/layout/layout.schema.v1.json', 'utf-8')) as JSONSchema7;

  const allLayoutSets = getAllLayoutSets(dir);
  it.each(allLayoutSets)('$appName/$setName', async ({ layouts, setName }) => {
    const firstKey = Object.keys(layouts)[0];
    const reduxState = getInitialStateMock();
    reduxState.formLayout.layouts = layouts;
    reduxState.formLayout.uiConfig.currentView = firstKey;
    reduxState.devTools.isOpen = true;
    reduxState.applicationMetadata.applicationMetadata!.onEntry = {
      show: setName,
    };

    await renderWithInstanceAndLayout({
      renderer: () => <DummyValidateApp />,
      reduxState,
      queries: { fetchLayoutSchema: () => Promise.resolve(layoutSchema) },
    });

    await waitFor(async () => expect(await screen.findByTestId('loading')).not.toBeInTheDocument());

    const errors = await screen.findByTestId('error');
    expect(errors).not.toBeInTheDocument();
  });
});

function DummyValidateApp() {
  const application = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  if (!isStatelessApp(application)) {
    throw new Error('Should be considered a stateless app - check the mocks if this is not working');
  }

  return (
    <LayoutValidationProvider>
      <InnerDummy />
    </LayoutValidationProvider>
  );
}

function InnerDummy() {
  const validationMessages = useLayoutValidation();
  const plainMessages: string[] = [];

  if (!validationMessages) {
    return <div data-testid='loading' />;
  }

  for (const [, layouts] of Object.entries(validationMessages)) {
    for (const [, layout] of Object.entries(layouts)) {
      for (const [, errors] of Object.entries(layout)) {
        for (const error of errors) {
          plainMessages.push(error);
        }
      }
    }
  }

  return (
    <>
      {plainMessages.map((message) => (
        <div
          data-testid='error'
          key={message}
        >
          {message}
        </div>
      ))}
    </>
  );
}
