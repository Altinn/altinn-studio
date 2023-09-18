import React from 'react';

import cn from 'classnames';

import classes from 'src/components/presentation/OrganisationLogo/OrganisationLogo.module.css';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { selectAppOwner } from 'src/selectors/language';
import { selectAppLogoAltText, selectAppLogoUrl, selectDisplayAppOwnerNameInHeader } from 'src/selectors/logo';
import { selectAppLogoSize } from 'src/selectors/simpleSelectors';

export const OrganisationLogo = () => {
  const appLogoUrl = useAppSelector(selectAppLogoUrl);
  const appLogoAltText = useAppSelector(selectAppLogoAltText);
  const appLogoSize = useAppSelector(selectAppLogoSize);
  const showAppOwner = useAppSelector(selectDisplayAppOwnerNameInHeader);
  const appOwner = useAppSelector(selectAppOwner);

  return (
    <div className={classes.container}>
      <img
        src={appLogoUrl}
        alt={appLogoAltText}
        className={cn(classes.img, classes[appLogoSize])}
      />
      {showAppOwner && <span>{appOwner}</span>}
    </div>
  );
};
