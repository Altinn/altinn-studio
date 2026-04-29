import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { useProcessNextOutsideFormProvider } from 'src/features/instance/useProcessNext';
import { doProcessNext } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IInstanceWithProcess } from 'src/core/api-client/instance.api';

function SubmitButton() {
  const { mutate } = useProcessNextOutsideFormProvider();
  return (
    <button
      type='button'
      onClick={() => mutate()}
    >
      Send inn
    </button>
  );
}

describe('ProcessWrapper', () => {
  // The Cypress feedback spec (test/e2e/integration/stateless-app/feedback.ts)
  // catches the symptom: a brief flash of "Denne delen av skjemaet er ikke
  // tilgjengelig" during a process/next transition. The flash is caused by
  // ProcessWrapper rendering the "wrong task" forbidden message in the window
  // between the cache being updated to the new currentTask and the URL being
  // navigated to that task.
  //
  // ProcessWrapper has a guard that is supposed to render a Loader for the
  // entire pending phase of the processNext mutation, which masks the cache/URL
  // window. The regression is that `useIsRunningProcessNext` is implemented as
  // a one-shot useEffect that only samples the mutation count once on mount,
  // instead of subscribing reactively. After mount the value is locked at
  // false, so when a mutation starts later (e.g., on button click) the Loader
  // never appears and the underlying race becomes user-visible.
  //
  // We test the guard directly: while a processNext mutation is in flight,
  // ProcessWrapper must render the Loader and not its children. This captures
  // the regression deterministically — no timing race needed.
  it('renders Loader (not children) while a processNext mutation is pending', async () => {
    // Keep the mutation in the pending state forever so we can observe the
    // guard's behavior without racing other state updates.
    jest.mocked(doProcessNext).mockImplementation(() => new Promise<AxiosResponse<IInstanceWithProcess>>(() => {}));

    const user = userEvent.setup();
    const utils = await renderWithInstanceAndLayout({
      renderer: () => (
        <ProcessWrapper>
          <SubmitButton />
        </ProcessWrapper>
      ),
    });

    // Sanity: before clicking, the wrapper has rendered its children.
    const submitBtn = await screen.findByRole('button', { name: 'Send inn' });

    await user.click(submitBtn);

    await waitFor(() => expect(jest.mocked(doProcessNext)).toHaveBeenCalled());

    // While the mutation is pending, the children must be hidden behind the
    // Loader. With the regression, useIsRunningProcessNext stays at the value
    // it was sampled at on mount (false), and the button stays visible.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Send inn' })).not.toBeInTheDocument();
    });
    expect(utils.queryByTestId('loader')).toBeInTheDocument();
  });
});
