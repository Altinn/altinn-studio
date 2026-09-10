import React from 'react';

import { screen } from '@testing-library/react';

import { LommebokComponent } from 'src/layout/Lommebok/LommebokComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('LommebokComponent', () => {
  it('renders the title', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'Min lommebok' },
      },
    });

    expect(screen.getByRole('heading', { name: 'Min lommebok' })).toBeInTheDocument();
  });

  it('renders a request document item with the request/upload buttons', async () => {
    await render({
      component: {
        request: [{ type: 'minid-pid' }],
      },
    });

    expect(screen.getByText('MinID PID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request from wallet' })).toBeInTheDocument();
  });

  it('shows the upload alternative only when configured', async () => {
    await render({
      component: {
        request: [{ type: 'minid-pid', alternativeUploadToDataType: 'someDataType' }],
      },
    });

    expect(screen.getByRole('button', { name: 'Upload document' })).toBeInTheDocument();
  });

  it('renders an issue document item with a warning when no URL is available yet', async () => {
    await render({
      component: {
        issue: [{ type: 'norsk-foererkort', urlField: 'someUrlField' }],
      },
    });

    expect(screen.getByText('No credential is available to issue yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to wallet' })).toBeDisabled();
  });
});

const render = async ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'Lommebok'>> = {}) => {
  await renderGenericComponentTest({
    type: 'Lommebok',
    renderer: (props) => <LommebokComponent {...props} />,
    component: {
      id: 'abc123',
      type: 'Lommebok',
      ...component,
    },
    genericProps,
  });
};
