import React, { useState } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { PolicyAccessPackage } from '@altinn/policy-editor/types';
import { PolicyAccordion } from '../PolicyAccordion/PolicyAccordion';
import { useResourceAccessPackageServicesQuery } from 'app-shared/hooks/queries/useResourceAccessPackageServicesQuery';
import { StudioSpinner } from '@studio/components';

interface PolicyAccessPackageAccordionProps {
  accessPackage: PolicyAccessPackage;
  selectedLanguage: 'nb' | 'nn' | 'en';
  selectPackageElement: React.ReactNode;
}

export const PolicyAccessPackageAccordion = ({
  accessPackage,
  selectedLanguage,
  selectPackageElement,
}: PolicyAccessPackageAccordionProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isServicesEnabled, setIsServicesEnabled] = useState<boolean>(false);

  const { data: services, isLoading } = useResourceAccessPackageServicesQuery(
    accessPackage.urn,
    localStorage.getItem('policyEditorAccessPackageEnv') || 'prod', // hardcoded to prod for now
    isServicesEnabled,
  );

  const onOpenAccordion = () => {
    setIsServicesEnabled(true);
  };

  return (
    <div className={classes.accessPackageAccordion}>
      <PolicyAccordion
        title={accessPackage.name}
        subTitle={accessPackage.description}
        extraHeaderContent={selectPackageElement}
        onOpened={onOpenAccordion}
      >
        {isLoading && (
          <StudioSpinner spinnerTitle={t('policy_editor.access_package_loading_services')} />
        )}
        {services?.length > 0 && (
          <>
            <div className={classes.serviceContainerHeader}>
              {t('policy_editor.access_package_services')}
            </div>
            {services.map((resource) => {
              return (
                <div key={resource.identifier} className={classes.serviceContainer}>
                  {resource.logoUrl ? (
                    <img
                      className={classes.logo}
                      src={resource.logoUrl}
                      alt={resource.hasCompetentAuthority.name[selectedLanguage]}
                      title={resource.hasCompetentAuthority.name[selectedLanguage]}
                    />
                  ) : (
                    <div className={classes.emptyLogo} />
                  )}
                  <div className={classes.serviceLabel}>{resource.title[selectedLanguage]}</div>
                  <div>{resource.hasCompetentAuthority.name[selectedLanguage]}</div>
                </div>
              );
            })}
          </>
        )}
        {services?.length === 0 && (
          <Paragraph size='xs'>{t('policy_editor.access_package_no_services')}</Paragraph>
        )}
      </PolicyAccordion>
    </div>
  );
};
