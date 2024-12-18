import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import { StudioParagraph } from '@studio/components';
import { PolicyAccessPackageServiceLogo } from './PolicyAccessPackageServiceLogo';
import type { AccessPackageResource } from 'app-shared/types/PolicyAccessPackages';

const selectedLanguage = 'nb';

type PolicyAccessPackageServicesProps = {
  services: AccessPackageResource[];
};
export const PolicyAccessPackageServices = ({
  services,
}: PolicyAccessPackageServicesProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      <StudioParagraph className={classes.serviceContainerHeader}>
        {t('policy_editor.access_package_services')}
      </StudioParagraph>
      {services.map((resource) => (
        <div key={resource.identifier} className={classes.serviceContainer}>
          <PolicyAccessPackageServiceLogo resource={resource} selectedLanguage={selectedLanguage} />
          <div className={classes.serviceLabel}>{resource.title[selectedLanguage]}</div>
          <div>{resource.hasCompetentAuthority.name[selectedLanguage]}</div>
        </div>
      ))}
    </>
  );
};
