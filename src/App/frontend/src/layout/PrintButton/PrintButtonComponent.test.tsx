import React from 'react';

import { screen } from '@testing-library/react';

import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

const render = async (component: Partial<CompExternal<'PrintButton'>> = {}) => {
  await renderGenericComponentTest({
    type: 'PrintButton',
    renderer: (props) => <PrintButtonComponent {...props} />,
    component,
  });
};

describe('PrintButton', () => {
  it('should display the default text if the text resource is not defined', async () => {
    await render();

    expect(screen.getByText('Print / Lagre PDF')).toBeInTheDocument();
  });

  it('should display custom text id defined', async () => {
    await render({
      textResourceBindings: {
        title: 'Skriv ut',
      },
    });

    expect(screen.getByText('Skriv ut')).toBeInTheDocument();
  });
});
