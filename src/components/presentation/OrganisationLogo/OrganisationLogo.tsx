import React from 'react';

import classes from 'src/components/presentation/OrganisationLogo/OrganisationLogo.module.css';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { selectAppOwner } from 'src/selectors/language';
import { selectAppLogoAltText, selectAppLogoUrl, selectDisplayAppOwnerNameInHeader } from 'src/selectors/logo';

export const OrganisationLogo = () => {
  const appLogoUrl = useAppSelector(selectAppLogoUrl);
  const appLogoAltText = useAppSelector(selectAppLogoAltText);
  const showAppOwner = useAppSelector(selectDisplayAppOwnerNameInHeader);
  const appOwner = useAppSelector(selectAppOwner);

  return (
    <div className={classes.container}>
      <img
        src={appLogoUrl}
        alt={appLogoAltText}
        className={classes.img}
      />
      {showAppOwner && <span>{appOwner}</span>}
    </div>
  );
};
