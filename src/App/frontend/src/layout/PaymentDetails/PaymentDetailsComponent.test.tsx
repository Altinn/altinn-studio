import React from 'react';

import { screen } from '@testing-library/react';

import { PaymentDetailsComponent } from 'src/layout/PaymentDetails/PaymentDetailsComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({ component }: Partial<RenderGenericComponentTestProps<'PaymentDetails'>> = {}) =>
  await renderGenericComponentTest({
    type: 'PaymentDetails',
    renderer: (props) => <PaymentDetailsComponent {...props} />,
    component: {
      textResourceBindings: { title: 'The order details title' },
      ...component,
    },
  });

describe('PaymentDetailsComponent', () => {
  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The order details title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The order details title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });
});
