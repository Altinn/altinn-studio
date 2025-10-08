import type { ChangeEventHandler, ReactElement } from 'react';
import React, { useCallback } from 'react';
import { FeatureFlag, useFeatureToggle } from '@studio/feature-flags';
import { StudioSwitch } from '@studio/components-legacy';
import { StudioCodeFragment, StudioHeading } from '@studio/components';
import classes from './FlagsPage.module.css';
import { useTranslation } from 'react-i18next';

export function FlagsPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <div className={classes.root}>
      <StudioHeading level={1}>{t('feature_flags.heading')}</StudioHeading>
      <FlagList />
    </div>
  );
}

function FlagList(): ReactElement {
  return (
    <>
      {Object.values(FeatureFlag).map((flag) => {
        return <Flag key={flag} flagName={flag} />;
      })}
    </>
  );
}

type FeatureFlagProps = {
  flagName: FeatureFlag;
};

function Flag({ flagName }: FeatureFlagProps): ReactElement {
  const { isEnabled, toggle } = useFeatureToggle(flagName);

  const handleToggle: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => toggle(e.target.checked),
    [toggle],
  );

  return (
    <StudioSwitch checked={isEnabled} onChange={handleToggle}>
      <StudioCodeFragment>{flagName}</StudioCodeFragment>
    </StudioSwitch>
  );
}
