import React, { type ReactElement } from 'react';
import classes from './PolicyAccessPackageServices.module.css';
import type { AccessPackageResource } from 'app-shared/types/PolicyAccessPackages';

export type PolicyAccessPackageServicesProps = {
  services: AccessPackageResource[];
  selectedLanguage: string;
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
            {resource.hasCompetentAuthority?.name?.[selectedLanguage] ??
              resource.hasCompetentAuthority?.orgcode}
          </div>
        </div>
      ))}
    </>
  );
};

type PolicyAccessPackageServiceLogoProps = {
  resource: AccessPackageResource;
  language: string;
};
export const PolicyAccessPackageServiceLogo = ({
  resource,
  language,
}: PolicyAccessPackageServiceLogoProps): ReactElement => {
  if (resource.logoUrl) {
    return (
      <img
        className={classes.logo}
        src={resource.logoUrl}
        alt={resource.hasCompetentAuthority.name?.[language]}
        title={resource.hasCompetentAuthority.name?.[language]}
      />
    );
  }
  return <div data-testid='no-service-logo' className={classes.emptyLogo} />;
};
