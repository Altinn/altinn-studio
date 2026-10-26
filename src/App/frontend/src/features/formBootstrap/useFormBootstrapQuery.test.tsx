import React, { useState } from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { useFormBootstrapQuery } from 'src/features/formBootstrap/useFormBootstrapQuery';
import { InstanceRouter, renderWithMinimalProviders } from 'src/test/renderWithProviders';

function BootstrapConsumer() {
  const { data } = useFormBootstrapQuery({ enabled: true, uiFolder: 'Task_1' });
  return data ? <p>Summary loaded</p> : null;
}

function Summaries() {
  const [showAnother, setShowAnother] = useState(false);
  return (
    <>
      <BootstrapConsumer />
      <button onClick={() => setShowAnother(true)}>Add another summary</button>
      {showAnother && <BootstrapConsumer />}
    </>
  );
}

describe('useFormBootstrapQuery', () => {
  it.each([
    { mode: 'PDF', query: 'pdf=1', expectedRequests: 1 },
    { mode: 'form', query: '', expectedRequests: 2 },
  ])('handles another bootstrap consumer in $mode mode', async ({ query, expectedRequests }) => {
    const { queries } = await renderWithMinimalProviders({
      renderer: () => <Summaries />,
      router: ({ children }) => <InstanceRouter query={query}>{children}</InstanceRouter>,
    });
    await screen.findByText('Summary loaded');

    await userEvent.click(screen.getByRole('button', { name: 'Add another summary' }));

    expect(screen.getAllByText('Summary loaded')).toHaveLength(2);
    expect(queries.fetchFormBootstrapForInstance).toHaveBeenCalledTimes(expectedRequests);
  });
});
