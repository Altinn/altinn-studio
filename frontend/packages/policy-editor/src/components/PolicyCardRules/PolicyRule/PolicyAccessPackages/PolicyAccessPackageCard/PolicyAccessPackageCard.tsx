import React from 'react';
import classes from './PolicyAccessPackageCard.module.css';
import type { PolicyAccessPackage } from '@altinn/policy-editor/types';
import {
  Checkbox,
  CheckboxGroup,
  Heading,
  Label,
  Paragraph,
  Tag,
} from '@digdir/designsystemet-react';

const CHECKED_VALUE = 'on';

interface PolicyAccessPackageCardProps {
  accessPackage: PolicyAccessPackage;
  isChecked: boolean;
  selectedLanguage: 'nb' | 'nn' | 'en';
  onChange: (accessPackage: PolicyAccessPackage) => void;
}

export const PolicyAccessPackageCard = ({
  accessPackage,
  isChecked,
  selectedLanguage,
  onChange,
}: PolicyAccessPackageCardProps): React.ReactElement => {
  return (
    <div className={classes.accessPackageCardWrapper}>
      <div className={classes.accessPackageCard}>
        <div className={classes.accessPackageHeading}>
          <Heading size='2xs' level={5}>
            {accessPackage.name[selectedLanguage]}
          </Heading>
          <CheckboxGroup
            hideLegend
            legend='Bruk tilgangspakke'
            value={isChecked ? [CHECKED_VALUE] : []}
            onChange={() => onChange(accessPackage)}
          >
            <Checkbox value={CHECKED_VALUE} />
          </CheckboxGroup>
        </div>
        <Paragraph size='sm' spacing>
          {accessPackage.description[selectedLanguage]}
        </Paragraph>
        {accessPackage.services.length > 0 && (
          <div>
            <Label>Inneholder disse tjenestene:</Label>
            {accessPackage.services.map((resource) => {
              return (
                <div key={resource.identifier} className={classes.serviceContainer}>
                  <span>{resource.title[selectedLanguage]}</span>
                  <Tag size='sm' color='info'>
                    {resource.hasCompetentAuthority.name[selectedLanguage]}
                  </Tag>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
