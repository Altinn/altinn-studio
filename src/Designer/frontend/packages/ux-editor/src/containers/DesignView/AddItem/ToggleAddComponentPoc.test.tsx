import React from 'react';
import { screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { ToggleAddComponentPoc } from './ToggleAddComponentPoc';
import { FeatureFlag } from '@studio/feature-flags';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

// Mocks:
const addFlag = jest.fn();
const removeFlag = jest.fn();

describe('ToggleAddComponentPoc', () => {
  beforeEach(jest.clearAllMocks);

  it('should render the component', () => {
    renderToggleAddComponentPoc();
    expect(screen.getByText('Prøv nytt design')).toBeInTheDocument();
  });

  it('Renders the switch in the disabled state when the flag is disabled', () => {
    renderToggleAddComponentPoc();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('Renders the switch in the enabled state when the flag is enabled', () => {
    renderToggleAddComponentPoc([FeatureFlag.AddComponentModal]);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('Calls addFlag with the correct flag when it is disabled and the switch is clicked', async () => {
    const user = userEvent.setup();
    renderToggleAddComponentPoc();
    await user.click(screen.getByRole('checkbox'));
    expect(addFlag).toHaveBeenCalledTimes(1);
    expect(addFlag).toHaveBeenCalledWith(FeatureFlag.AddComponentModal);
  });

  it('Calls removeFlag with the correct flag when it is enabled and the switch is clicked', async () => {
    const user = userEvent.setup();
    renderToggleAddComponentPoc([FeatureFlag.AddComponentModal]);
    await user.click(screen.getByRole('checkbox'));
    expect(removeFlag).toHaveBeenCalledTimes(1);
    expect(removeFlag).toHaveBeenCalledWith(FeatureFlag.AddComponentModal);
  });
});

function renderToggleAddComponentPoc(featureFlags: FeatureFlag[] = []): RenderResult {
  return renderWithProviders(<ToggleAddComponentPoc />, {
    featureFlags,
    featureFlagMutations: { addFlag, removeFlag },
  });
}
