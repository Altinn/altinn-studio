import React, { type ReactElement } from 'react';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { AccessPackageResource } from 'app-shared/types/PolicyAccessPackages';

type PolicyAccessPackageServiceLogoProps = {
  resource: AccessPackageResource;
  selectedLanguage: string;
};
export const PolicyAccessPackageServiceLogo = ({
  resource,
  selectedLanguage,
}: PolicyAccessPackageServiceLogoProps): ReactElement => {
  if (resource.logoUrl) {
    return (
      <img
        className={classes.logo}
        src={resource.logoUrl}
        alt={resource.hasCompetentAuthority.name[selectedLanguage]}
        title={resource.hasCompetentAuthority.name[selectedLanguage]}
      />
    );
  }
  return <div className={classes.emptyLogo} />;
};
