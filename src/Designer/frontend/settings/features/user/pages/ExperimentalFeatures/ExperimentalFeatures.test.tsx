import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureFlag, experimentalFeatureFlags } from '@studio/feature-flags';
import { textMock } from '@studio/testing/mocks/i18nMock';
import nb from '@altinn-studio/language/src/nb.json';
import { renderWithProviders } from '../../../../testing/mocks';
import { ExperimentalFeatures } from './ExperimentalFeatures';

const featureFlagsStorageKey = 'featureFlags';
const modeStorageKey = 'experimentalFeaturesMode';

const renderExperimentalFeatures = () => renderWithProviders(<ExperimentalFeatures />);

const getSwitch = (flag: FeatureFlag) =>
  screen.getByRole('switch', {
    name: textMock(`settings.user.experimental_features.${flag}.label`),
  });

const getAllRadio = () =>
  screen.getByRole('radio', {
    name: textMock('settings.user.experimental_features.mode.all.label'),
  });

const getCustomRadio = () =>
  screen.getByRole('radio', {
    name: textMock('settings.user.experimental_features.mode.custom.label'),
  });

const getStoredFlags = (): string[] =>
  JSON.parse(localStorage.getItem(featureFlagsStorageKey) ?? '[]');

const getStoredMode = (): string | null => JSON.parse(localStorage.getItem(modeStorageKey));

const storeFlags = (flags: FeatureFlag[]): void =>
  localStorage.setItem(featureFlagsStorageKey, JSON.stringify(flags));

const storeMode = (mode: string): void =>
  localStorage.setItem(modeStorageKey, JSON.stringify(mode));

describe('ExperimentalFeatures', () => {
  afterEach(() => localStorage.clear());

  it('renders the page heading', () => {
    renderExperimentalFeatures();
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.user.experimental_features.heading'),
      }),
    ).toBeInTheDocument();
  });

  it('warns that the features are under development', () => {
    renderExperimentalFeatures();
    expect(
      screen.getByText(textMock('settings.user.experimental_features.warning')),
    ).toBeInTheDocument();
  });

  it.each(experimentalFeatureFlags)('renders a switch for %s', (flag) => {
    renderExperimentalFeatures();
    expect(getSwitch(flag)).toBeInTheDocument();
  });

  it('renders a switch only for each experimental feature', () => {
    renderExperimentalFeatures();
    expect(screen.getAllByRole('switch')).toHaveLength(experimentalFeatureFlags.length);
  });

  it('does not show flags that are only for developers', () => {
    renderExperimentalFeatures();
    expect(
      screen.queryByRole('switch', {
        name: textMock(
          `settings.user.experimental_features.${FeatureFlag.ShouldOverrideAppLibCheck}.label`,
        ),
      }),
    ).not.toBeInTheDocument();
  });

  it('chooses the custom mode when nothing is stored', () => {
    renderExperimentalFeatures();
    expect(getCustomRadio()).toBeChecked();
    expect(getAllRadio()).not.toBeChecked();
  });

  it('shows how many features are on', () => {
    const [flag] = experimentalFeatureFlags;
    storeFlags([flag]);
    renderExperimentalFeatures();
    expect(
      screen.getByText(
        textMock('settings.user.experimental_features.enabled_count', {
          enabled: 1,
          total: experimentalFeatureFlags.length,
        }),
      ),
    ).toBeInTheDocument();
  });

  describe('in the custom mode', () => {
    it('shows a feature as on when it is stored in the browser', () => {
      const [flag] = experimentalFeatureFlags;
      storeFlags([flag]);
      renderExperimentalFeatures();
      expect(getSwitch(flag)).toBeChecked();
    });

    it('stores the feature in the browser when it is turned on', async () => {
      const user = userEvent.setup();
      const [flag] = experimentalFeatureFlags;
      renderExperimentalFeatures();
      await user.click(getSwitch(flag));
      expect(getSwitch(flag)).toBeChecked();
      expect(getStoredFlags()).toEqual([flag]);
    });

    it('removes the feature from the browser when it is turned off', async () => {
      const user = userEvent.setup();
      const [flag] = experimentalFeatureFlags;
      storeFlags([flag]);
      renderExperimentalFeatures();
      await user.click(getSwitch(flag));
      expect(getSwitch(flag)).not.toBeChecked();
      expect(getStoredFlags()).toEqual([]);
    });

    it('does not show the hint about the all mode', () => {
      renderExperimentalFeatures();
      expect(
        screen.queryByText(textMock('settings.user.experimental_features.all_mode_hint')),
      ).not.toBeInTheDocument();
    });
  });

  describe('in the all mode', () => {
    it('turns every feature on when the all mode is chosen', async () => {
      const user = userEvent.setup();
      renderExperimentalFeatures();
      await user.click(getAllRadio());
      expect(getStoredMode()).toBe('all');
      experimentalFeatureFlags.forEach((flag) => expect(getSwitch(flag)).toBeChecked());
    });

    it('shows the hint about the all mode', () => {
      storeMode('all');
      renderExperimentalFeatures();
      expect(
        screen.getByText(textMock('settings.user.experimental_features.all_mode_hint')),
      ).toBeInTheDocument();
    });

    it('changes to the custom mode with the other features still on when a feature is turned off', async () => {
      const user = userEvent.setup();
      const [flagToTurnOff, ...otherFlags] = experimentalFeatureFlags;
      storeMode('all');
      renderExperimentalFeatures();
      await user.click(getSwitch(flagToTurnOff));
      expect(getCustomRadio()).toBeChecked();
      expect(getSwitch(flagToTurnOff)).not.toBeChecked();
      otherFlags.forEach((flag) => expect(getSwitch(flag)).toBeChecked());
    });

    it('restores the earlier custom choices when the custom mode is chosen again', async () => {
      const user = userEvent.setup();
      const [storedFlag, ...otherFlags] = experimentalFeatureFlags;
      storeFlags([storedFlag]);
      storeMode('all');
      renderExperimentalFeatures();
      await user.click(getCustomRadio());
      expect(getSwitch(storedFlag)).toBeChecked();
      otherFlags.forEach((flag) => expect(getSwitch(flag)).not.toBeChecked());
    });
  });

  it.each(experimentalFeatureFlags)('has a Norwegian label and description for %s', (flag) => {
    const texts: Record<string, string> = nb;
    expect(texts[`settings.user.experimental_features.${flag}.label`]).toBeTruthy();
    expect(texts[`settings.user.experimental_features.${flag}.description`]).toBeTruthy();
  });
});
