import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { PolicyAccessPackage } from '@altinn/policy-editor/types';
import { Paragraph } from '@digdir/designsystemet-react';
import { PolicyAccordion } from '../PolicyAccordion/PolicyAccordion';

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

  return (
    <div className={classes.accessPackageAccordion}>
      <PolicyAccordion
        title={accessPackage.name}
        subTitle={accessPackage.description}
        extraHeaderContent={selectPackageElement}
      >
        {accessPackage.services.length > 0 ? (
          <>
            <div className={classes.serviceContainerHeader}>
              {t('policy_editor.policy_editor.access_package_services')}
            </div>
            {accessPackage.services.map((resource) => {
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
        ) : (
          <Paragraph size='xs'>{t('policy_editor.access_package_no_services')}</Paragraph>
        )}
      </PolicyAccordion>
    </div>
  );
};
