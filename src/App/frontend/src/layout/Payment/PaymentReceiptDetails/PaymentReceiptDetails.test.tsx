import React from 'react';

import { screen, within } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { PaymentReceiptDetails } from 'src/layout/Payment/PaymentReceiptDetails/PaymentReceiptDetails';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';

describe('PaymentReceiptDetails', () => {
  it('renders receiver and payer details as valid table bodies', async () => {
    await renderGenericComponentTest({
      type: 'Payment',
      renderer: () => <PaymentReceiptDetails />,
      apis: {
        instanceApi: {
          getInstance: async () => {
            const instance = getInstanceWithProcessMock();
            if (instance.process.currentTask) {
              instance.process.currentTask.altinnTaskType = 'payment';
            }
            return instance;
          },
        },
      },
    });

    for (const name of ['Patentstyret', 'John Doe']) {
      const cell = screen.getByText(name);
      const table = cell.closest('table');
      expect(table).toBeInTheDocument();
      if (!table) {
        throw new Error(`Missing receipt table for ${name}`);
      }
      const rows = within(table).getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.parentElement?.tagName).toBe('TBODY');
      }
    }
  });
});
