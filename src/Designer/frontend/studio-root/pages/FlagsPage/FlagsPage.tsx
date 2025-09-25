import type { ChangeEvent, ReactElement } from 'react';
import React, { useCallback, useState } from 'react';
import { isFeatureActivatedByLocalStorage, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { StudioSwitch } from '@studio/components-legacy';
import { StudioCodeFragment, StudioHeading } from '@studio/components';
import { setFeatureFlagInLocalStorage } from './setFeatureFlagInLocalStorage';
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
  const [enabled, setEnabled] = useState<boolean>(isFeatureActivatedByLocalStorage(flagName));

  const handleToggle = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const { checked } = e.target;
      setFeatureFlagInLocalStorage(flagName, checked);
      setEnabled(checked);
    },
    [flagName, setEnabled],
  );

  return (
    <StudioSwitch checked={enabled} onChange={handleToggle}>
      <StudioCodeFragment>{flagName}</StudioCodeFragment>
    </StudioSwitch>
  );
}
