import React from 'react';

import { screen } from '@testing-library/react';

import { PaymentContext } from 'src/features/payment/PaymentProvider';
import { PaymentComponent } from 'src/layout/Payment/PaymentComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const render = async ({ component }: Partial<RenderGenericComponentTestProps<'Payment'>> = {}) =>
  await renderGenericComponentTest({
    type: 'Payment',
    renderer: (props) => (
      <PaymentContext.Provider value={{ performPayment: () => {}, paymentError: null }}>
        <PaymentComponent {...props} />
      </PaymentContext.Provider>
    ),
    component: {
      textResourceBindings: { title: 'The payment title' },
      ...component,
    },
  });

describe('PaymentComponent', () => {
  it('should render the title and a help text button when a help text is set', async () => {
    await render({
      component: {
        textResourceBindings: { title: 'The payment title', help: 'this is the help text' },
      },
    });

    expect(screen.getByText('The payment title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hjelp/i })).toBeInTheDocument();
  });
});
