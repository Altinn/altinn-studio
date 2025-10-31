import {
  FeatureFlag,
  FeatureFlagsContextProvider,
  FeatureFlagMutationContextProvider,
} from '@studio/feature-flags';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { FlagsPage } from './FlagsPage';
import React from 'react';
import { userEvent } from '@testing-library/user-event';

const allFlags: FeatureFlag[] = Object.values(FeatureFlag);

// Mocks:
const addFlag = jest.fn();
const removeFlag = jest.fn();

describe('FlagsPage', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders a switch for each flag', () => {
    renderFlagsPage();
    allFlags.forEach((flag) => {
      expect(screen.getByRole('switch', { name: flag })).toBeInTheDocument();
    });
  });

  it('Renders the switches as unchecked by default', () => {
    renderFlagsPage();
    allFlags.forEach((flag) => {
      expect(screen.getByRole('switch', { name: flag })).not.toBeChecked();
    });
  });

  it('Renders the switch as checked when the corresponding flag is enabled', () => {
    const enabledFlag = allFlags[0];
    renderFlagsPage([enabledFlag]);
    expect(screen.getByRole('switch', { name: enabledFlag })).toBeChecked();
  });

  it('Calls the addFlag callback with the correct flag when the user checks the switch', async () => {
    const user = userEvent.setup();
    renderFlagsPage();
    const flagToEnable = allFlags[0];
    const switchElement = screen.getByRole('switch', { name: flagToEnable });
    await user.click(switchElement);
    expect(addFlag).toHaveBeenCalledTimes(1);
    expect(addFlag).toHaveBeenCalledWith(flagToEnable);
  });

  it('Calls the removeFlag callback with the correct flag when the user unchecks the switch', async () => {
    const user = userEvent.setup();
    const enabledFlag = allFlags[0];
    renderFlagsPage([enabledFlag]);
    const switchElement = screen.getByRole('switch', { name: enabledFlag });
    await user.click(switchElement);
    expect(removeFlag).toHaveBeenCalledTimes(1);
    expect(removeFlag).toHaveBeenCalledWith(enabledFlag);
  });
});

function renderFlagsPage(flags: FeatureFlag[] = []): RenderResult {
  return render(<FlagsPage />, {
    wrapper: ({ children }) => (
      <FeatureFlagMutationContextProvider value={{ addFlag, removeFlag }}>
        <FeatureFlagsContextProvider value={{ flags }}>{children}</FeatureFlagsContextProvider>
      </FeatureFlagMutationContextProvider>
    ),
  });
}
