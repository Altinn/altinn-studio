import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { PolicyAccessPackage } from '@altinn/policy-editor/types';
import { Paragraph } from '@digdir/designsystemet-react';
import { StudioLabelAsParagraph } from '@studio/components';
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
          accessPackage.services.map((resource) => {
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
                <StudioLabelAsParagraph size='sm' className={classes.serviceLabel}>
                  {resource.title[selectedLanguage]}
                </StudioLabelAsParagraph>
                <Paragraph size='xs'>
                  {resource.hasCompetentAuthority.name[selectedLanguage]}
                </Paragraph>
              </div>
            );
          })
        ) : (
          <Paragraph size='sm'>{t('policy_editor.access_package_no_services')}</Paragraph>
        )}
      </PolicyAccordion>
    </div>
  );
};
