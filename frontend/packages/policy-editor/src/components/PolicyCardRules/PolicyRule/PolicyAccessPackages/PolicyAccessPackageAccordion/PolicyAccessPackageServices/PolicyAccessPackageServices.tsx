import React, { type ReactElement } from 'react';
import classes from './PolicyAccessPackageServices.module.css';
import type {
  AccessPackageResource,
  AccessPackageResourceLanguage,
} from 'app-shared/types/PolicyAccessPackages';

export type PolicyAccessPackageServicesProps = {
  services: AccessPackageResource[];
  selectedLanguage: AccessPackageResourceLanguage;
};
export const PolicyAccessPackageServices = ({
  services,
  selectedLanguage,
}: PolicyAccessPackageServicesProps): ReactElement => {
  return (
    <>
      {services.map((resource) => (
        <div key={resource.identifier} className={classes.serviceContainer}>
          <PolicyAccessPackageServiceLogo resource={resource} language={selectedLanguage} />
          <div className={classes.serviceLabel}>
            {resource.title?.[selectedLanguage] ?? resource.identifier}
          </div>
          <div>
            {resource.hasCompetentAuthority.name?.[selectedLanguage] ??
              resource.hasCompetentAuthority.orgcode}
          </div>
        </div>
      ))}
    </>
  );
};

type PolicyAccessPackageServiceLogoProps = {
  resource: AccessPackageResource;
  language: AccessPackageResourceLanguage;
};
export const PolicyAccessPackageServiceLogo = ({
  resource,
  language,
}: PolicyAccessPackageServiceLogoProps): ReactElement => {
  if (resource.logoUrl) {
    const altText =
      resource.hasCompetentAuthority.name?.[language] ?? resource.hasCompetentAuthority.orgcode;
    return <img className={classes.logo} src={resource.logoUrl} alt={altText} title={altText} />;
  }
  return <div data-testid='no-service-logo' className={classes.emptyLogo} />;
};
