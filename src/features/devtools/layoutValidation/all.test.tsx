import React from 'react';

import { expect } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import type { jest } from '@jest/globals';
import type { JSONSchema7 } from 'json-schema';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import {
  LayoutValidationProvider,
  useLayoutValidation,
} from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { ensureAppsDirIsSet, getAllLayoutSets } from 'src/test/allApps';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

describe('All known apps should work with layout validation', () => {
  const dir = ensureAppsDirIsSet();
  if (!dir) {
    return;
  }

  const layoutSchema = JSON.parse(fs.readFileSync('schemas/json/layout/layout.schema.v1.json', 'utf-8')) as JSONSchema7;

  const allLayoutSets = getAllLayoutSets(dir);
  it.each(allLayoutSets)('$appName/$setName', async ({ layouts, setName }) => {
    (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementation(() =>
      Promise.resolve(
        getIncomingApplicationMetadataMock((a) => {
          a.onEntry = {
            show: setName,
          };
        }),
      ),
    );

    // TODO: Make sure devTools panel is open in tests
    await renderWithInstanceAndLayout({
      renderer: () => <DummyValidateApp />,
      queries: {
        fetchLayouts: async () => layouts,
        fetchLayoutSchema: async () => layoutSchema,
      },
    });

    await waitFor(async () => expect(await screen.findByTestId('loading')).not.toBeInTheDocument());

    const errors = await screen.findByTestId('error');
    expect(errors).not.toBeInTheDocument();
  });
});

function DummyValidateApp() {
  const application = useApplicationMetadata();
  if (!application.isStatelessApp) {
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
