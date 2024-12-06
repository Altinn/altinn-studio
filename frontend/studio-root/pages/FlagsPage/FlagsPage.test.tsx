import { FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { typedLocalStorage } from '@studio/pure-functions'; // Todo: Move this to a more suitable place: https://github.com/Altinn/altinn-studio/issues/14230
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { FlagsPage } from './FlagsPage';
import React from 'react';
import { userEvent } from '@testing-library/user-event';

const flags: FeatureFlag[] = Object.values(FeatureFlag);

describe('FlagsPage', () => {
  beforeEach(() => typedLocalStorage.removeItem('featureFlags'));

  it('Renders a checkbox for each flag', () => {
    renderFlagsPage();
    flags.forEach((flag) => {
      expect(screen.getByRole('checkbox', { name: flag })).toBeInTheDocument();
    });
  });

  it('Renders the chechkboxes as unchecked by default', () => {
    renderFlagsPage();
    flags.forEach((flag) => {
      expect(screen.getByRole('checkbox', { name: flag })).not.toBeChecked();
    });
  });

  it('Renders the chechkbox as checked when the corresponding flag is enabled', () => {
    const enabledFlag = flags[0];
    typedLocalStorage.setItem('featureFlags', [enabledFlag]);
    renderFlagsPage();
    expect(screen.getByRole('checkbox', { name: enabledFlag })).toBeChecked();
  });

  it('Adds the flag to the list of enabled flags when the user checks the checkbox', async () => {
    const user = userEvent.setup();
    renderFlagsPage();
    const flagToEnable = flags[0];
    const checkbox = screen.getByRole('checkbox', { name: flagToEnable });
    await user.click(checkbox);
    expect(typedLocalStorage.getItem('featureFlags')).toEqual([flagToEnable]);
  });

  it('Removes the flag from the list of enabled flags when the user unchecks the checkbox', async () => {
    const user = userEvent.setup();
    const enabledFlag = flags[0];
    typedLocalStorage.setItem('featureFlags', [enabledFlag]);
    renderFlagsPage();
    const checkbox = screen.getByRole('checkbox', { name: enabledFlag });
    await user.click(checkbox);
    expect(typedLocalStorage.getItem('featureFlags')).toEqual([]);
  });
});

function renderFlagsPage(): RenderResult {
  return render(<FlagsPage />);
}
