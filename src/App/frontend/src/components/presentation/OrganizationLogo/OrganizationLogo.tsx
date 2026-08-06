import React from 'react';

import cn from 'classnames';

import classes from 'src/components/presentation/OrganisationLogo/OrganisationLogo.module.css';
import { useAppLogoAltText, useAppOwner } from 'src/core/texts/appTexts';
import { useAppLogoSize, useAppLogoUrl, useDisplayAppOwnerNameInHeader } from 'src/hooks/useAppLogo';

export const OrganisationLogo = () => {
  const appLogoUrl = useAppLogoUrl();
  const appLogoAltText = useAppLogoAltText();
  const appLogoSize = useAppLogoSize();
  const showAppOwner = useDisplayAppOwnerNameInHeader();
  const appOwner = useAppOwner();

  return (
    <div className={classes.container}>
      <img
        src={appLogoUrl}
        alt={appLogoAltText}
        className={cn(classes[appLogoSize])}
      />
      {showAppOwner && <span>{appOwner}</span>}
    </div>
  );
};
