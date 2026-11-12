import type { ChangeEventHandler, ReactElement } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioHeading,
  StudioParagraph,
  StudioSwitch,
  StudioTag,
} from '@studio/components';
import type { FeatureFlag } from '@studio/feature-flags';
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
        <StudioHeading level={2} data-size='sm'>
          {t('settings.user.experimental_features.page_heading')}
        </StudioHeading>
        <StudioParagraph>
          {t('settings.user.experimental_features.description')}
          <br />
          {t('settings.user.experimental_features.choose_description')}
        </StudioParagraph>
      </div>
      <StudioAlert data-color='warning'>
        <StudioParagraph>{t('settings.user.experimental_features.warning')}</StudioParagraph>
      </StudioAlert>
      <div className={classes.cards}>
        <SelectAll />
        <ul className={classes.featureList}>
          {experimentalFeatureFlags.map((flag) => (
            <li key={flag} className={classes.card}>
              <ExperimentalFeature flag={flag} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SelectAll(): ReactElement {
  const { t } = useTranslation();
  const { mode, setMode } = useExperimentalFeaturesMode();
  const { flags } = useFeatureFlagsContext();
  const enabledCount = experimentalFeatureFlags.filter((flag) => flags.includes(flag)).length;

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => setMode(event.target.checked ? 'all' : 'custom'),
    [setMode],
  );

  return (
    <div className={`${classes.card} ${classes.selectAll}`}>
      <StudioSwitch
        data-size='sm'
        checked={mode === 'all'}
        onChange={handleChange}
        label={
          <span className={classes.selectAllLabel}>
            {t('settings.user.experimental_features.select_all.label')}
          </span>
        }
        description={t('settings.user.experimental_features.select_all.description')}
      />
      <StudioParagraph data-size='sm' className={classes.subtle}>
        {t('settings.user.experimental_features.enabled_count', {
          enabled: enabledCount,
          total: experimentalFeatureFlags.length,
        })}
      </StudioParagraph>
    </div>
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
      data-size='sm'
      checked={isEnabled}
      onChange={handleChange}
      label={label}
      description={t(`settings.user.experimental_features.${flag}.description`)}
    />
  );
}
