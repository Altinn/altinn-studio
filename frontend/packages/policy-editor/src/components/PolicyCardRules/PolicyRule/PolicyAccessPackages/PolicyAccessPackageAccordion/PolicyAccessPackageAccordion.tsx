import React from 'react';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { PolicyAccessPackage } from '@altinn/policy-editor/types';
import { Checkbox, CheckboxGroup, Label, Tag } from '@digdir/designsystemet-react';
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
  return (
    <div className={classes.accessPackageAccordion}>
      <PolicyAccordion
        title={accessPackage.name[selectedLanguage]}
        subTitle={accessPackage.description[selectedLanguage]}
        extraHeaderContent={
          <CheckboxGroup
            hideLegend
            legend={`${isChecked ? 'fjern' : 'legg til'} tilgangspakke ${accessPackage.name[selectedLanguage]}`}
            className={classes.accordionCheckbox}
            value={isChecked ? [CHECKED_VALUE] : []}
            onChange={() => onChange(accessPackage)}
          >
            <Checkbox value={CHECKED_VALUE} />
          </CheckboxGroup>
        }
      >
        {accessPackage.services.length > 0 ? (
          accessPackage.services.map((resource) => {
            return (
              <div key={resource.identifier} className={classes.serviceContainer}>
                <Label size='sm'>{resource.title[selectedLanguage]}</Label>
                <Tag size='sm' color='info'>
                  {resource.hasCompetentAuthority.name[selectedLanguage]}
                </Tag>
              </div>
            );
          })
        ) : (
          <div>Denne tilgangspakken inneholder ingen tjenester enda</div>
        )}
      </PolicyAccordion>
    </div>
  );
};
