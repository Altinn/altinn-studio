import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { PolicyAccessPackage } from '@altinn/policy-editor/types';
import { Checkbox, CheckboxGroup, Paragraph } from '@digdir/designsystemet-react';
import { StudioLabelAsParagraph } from '@studio/components';
import { PolicyAccordion } from '../PolicyAccordion/PolicyAccordion';

const CHECKED_VALUE = 'on';

interface PolicyAccessPackageAccordionProps {
  accessPackage: PolicyAccessPackage;
  isChecked: boolean;
  selectedLanguage: 'nb' | 'nn' | 'en';
  onChange: (accessPackage: PolicyAccessPackage) => void;
}

export const PolicyAccessPackageAccordion = ({
  accessPackage,
  isChecked,
  selectedLanguage,
  onChange,
}: PolicyAccessPackageAccordionProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={classes.accessPackageAccordion}>
      <PolicyAccordion
        title={accessPackage.name[selectedLanguage]}
        subTitle={accessPackage.description[selectedLanguage]}
        extraHeaderContent={
          <CheckboxGroup
            legend=''
            className={classes.accordionCheckbox}
            value={isChecked ? [CHECKED_VALUE] : []}
            onChange={() => onChange(accessPackage)}
          >
            <Checkbox
              value={CHECKED_VALUE}
              aria-label={
                isChecked
                  ? t('policy_editor.access_package_remove', {
                      packageName: accessPackage.name[selectedLanguage],
                    })
                  : t('policy_editor.access_package_add', {
                      packageName: accessPackage.name[selectedLanguage],
                    })
              }
            />
          </CheckboxGroup>
        }
      >
        {accessPackage.services.length > 0 ? (
          accessPackage.services.map((resource) => {
            return (
              <div key={resource.identifier} className={classes.serviceContainer}>
                {resource.iconUrl ? (
                  <img
                    className={classes.logo}
                    src={resource.iconUrl}
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
