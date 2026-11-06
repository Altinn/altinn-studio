import type { ChangeEventHandler, ReactElement } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioFieldset,
  StudioHeading,
  StudioParagraph,
  StudioRadio,
  StudioSwitch,
  StudioTag,
} from '@studio/components';
import type { ExperimentalFeaturesMode, FeatureFlag } from '@studio/feature-flags';
import {
  experimentalFeatureFlags,
  featureFlagConfig,
  useExperimentalFeaturesMode,
  useFeatureFlagsContext,
  useFeatureToggle,
} from '@studio/feature-flags';
import classes from './ExperimentalFeatures.module.css';

export function ExperimentalFeatures(): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={classes.container}>
      <div className={classes.intro}>
        <StudioHeading level={2} data-size='md'>
          {t('settings.user.experimental_features.heading')}
        </StudioHeading>
        <StudioParagraph>{t('settings.user.experimental_features.description')}</StudioParagraph>
      </div>
      <StudioAlert data-color='warning'>
        <StudioParagraph>{t('settings.user.experimental_features.warning')}</StudioParagraph>
      </StudioAlert>
      <ModeChoice />
      <FeatureList />
    </div>
  );
}

function ModeChoice(): ReactElement {
  const { t } = useTranslation();
  const { mode, setMode } = useExperimentalFeaturesMode();

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => setMode(event.target.value as ExperimentalFeaturesMode),
    [setMode],
  );

  return (
    <StudioFieldset legend={t('settings.user.experimental_features.mode.legend')}>
      <div className={classes.modeCards}>
        <div className={classes.modeCard}>
          <StudioRadio
            name='experimentalFeaturesMode'
            value='all'
            checked={mode === 'all'}
            onChange={handleChange}
            label={t('settings.user.experimental_features.mode.all.label')}
            description={t('settings.user.experimental_features.mode.all.description')}
          />
        </div>
        <div className={classes.modeCard}>
          <StudioRadio
            name='experimentalFeaturesMode'
            value='custom'
            checked={mode === 'custom'}
            onChange={handleChange}
            label={t('settings.user.experimental_features.mode.custom.label')}
            description={t('settings.user.experimental_features.mode.custom.description')}
          />
        </div>
      </div>
    </StudioFieldset>
  );
}

function FeatureList(): ReactElement {
  const { t } = useTranslation();
  const { mode } = useExperimentalFeaturesMode();
  const { flags } = useFeatureFlagsContext();
  const enabledCount = experimentalFeatureFlags.filter((flag) => flags.includes(flag)).length;

  return (
    <section className={classes.featureSection}>
      <div className={classes.featureListHeader}>
        <StudioHeading level={3} data-size='2xs'>
          {t('settings.user.experimental_features.features_heading')}
        </StudioHeading>
        <StudioParagraph data-size='sm' className={classes.subtle}>
          {t('settings.user.experimental_features.enabled_count', {
            enabled: enabledCount,
            total: experimentalFeatureFlags.length,
          })}
        </StudioParagraph>
      </div>
      {mode === 'all' && (
        <StudioParagraph data-size='sm' className={classes.subtle}>
          {t('settings.user.experimental_features.all_mode_hint')}
        </StudioParagraph>
      )}
      <ul className={classes.featureList}>
        {experimentalFeatureFlags.map((flag) => (
          <li key={flag} className={classes.featureItem}>
            <ExperimentalFeature flag={flag} />
          </li>
        ))}
      </ul>
    </section>
  );
}

type ExperimentalFeatureProps = {
  flag: FeatureFlag;
};

function ExperimentalFeature({ flag }: ExperimentalFeatureProps): ReactElement {
  const { t } = useTranslation();
  const { isEnabled, toggle } = useFeatureToggle(flag);

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => toggle(event.target.checked),
    [toggle],
  );

  const label = (
    <span className={classes.featureLabel}>
      {t(`settings.user.experimental_features.${flag}.label`)}
      {featureFlagConfig[flag].isNew && (
        <StudioTag data-color='info' data-size='sm'>
          {t('settings.user.experimental_features.new_tag')}
        </StudioTag>
      )}
    </span>
  );

  return (
    <StudioSwitch
      checked={isEnabled}
      onChange={handleChange}
      label={label}
      description={t(`settings.user.experimental_features.${flag}.description`)}
    />
  );
}
