import React, { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './PolicyAccessPackageAccordion.module.css';
import type { AccessPackageResource, PolicyAccessPackage } from '@altinn/policy-editor';
import { PolicyAccordion } from '../PolicyAccordion';
import { useResourceAccessPackageServicesQuery } from 'app-shared/hooks/queries/useResourceAccessPackageServicesQuery';
import { StudioCheckbox, StudioParagraph, StudioSpinner } from '@studio/components';

const selectedLanguage = 'nb';

interface PolicyAccessPackageAccordionProps {
  accessPackage: PolicyAccessPackage;
  isChecked: boolean;
  handleSelectChange: (accessPackageUrn: string) => void;
}

export const PolicyAccessPackageAccordion = ({
  accessPackage,
  isChecked,
  handleSelectChange,
}: PolicyAccessPackageAccordionProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isServicesEnabled, setIsServicesEnabled] = useState<boolean>(false);

  // Determine enviroment to load resources/apps connected to each access packages from. Option to override this
  // value with a localStorage setting is for testing. Valid options are 'at22', 'at23', 'at24', 'tt02'
  const accessPackageResourcesEnv = localStorage.getItem('accessPackageResourcesEnv') || 'prod';

  const { data: services, isLoading } = useResourceAccessPackageServicesQuery(
    accessPackage.urn,
    accessPackageResourcesEnv,
    isServicesEnabled,
  );

  const onOpenAccordion = () => {
    setIsServicesEnabled(true);
  };

  const hasServices: boolean = services?.length > 0;
  const serviceListIsEmpty: boolean = services?.length === 0;

  return (
    <div className={classes.accessPackageAccordion}>
      <PolicyAccordion
        title={accessPackage.name}
        subTitle={accessPackage.description}
        extraHeaderContent={
          <PolicyAccordionCheckBox
            isChecked={isChecked}
            handleSelectChange={handleSelectChange}
            accessPackage={accessPackage}
          />
        }
        onOpened={onOpenAccordion}
      >
        {isLoading && (
          <StudioSpinner spinnerTitle={t('policy_editor.access_package_loading_services')} />
        )}
        {hasServices && <Services services={services} />}
        {serviceListIsEmpty && (
          <StudioParagraph className={classes.noServicesText}>
            {t('policy_editor.access_package_no_services')}
          </StudioParagraph>
        )}
      </PolicyAccordion>
    </div>
  );
};

type ServicesProps = {
  services: AccessPackageResource[];
};
const Services = ({ services }: ServicesProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      <StudioParagraph className={classes.serviceContainerHeader}>
        {t('policy_editor.access_package_services')}
      </StudioParagraph>
      {services.map((resource) => (
        <div key={resource.identifier} className={classes.serviceContainer}>
          <ResourceImage resource={resource} />
          <div className={classes.serviceLabel}>{resource.title[selectedLanguage]}</div>
          <div>{resource.hasCompetentAuthority.name[selectedLanguage]}</div>
        </div>
      ))}
    </>
  );
};

type ResourceImageProps = {
  resource: AccessPackageResource;
};
const ResourceImage = ({ resource }: ResourceImageProps): ReactElement => {
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

type PolicyAccordionCheckBoxProps = Pick<
  PolicyAccessPackageAccordionProps,
  'accessPackage' | 'isChecked' | 'handleSelectChange'
>;
const PolicyAccordionCheckBox = ({
  accessPackage,
  isChecked,
  handleSelectChange,
}: PolicyAccordionCheckBoxProps): ReactElement => {
  const { t } = useTranslation();
  const CHECKED_VALUE = 'on';

  const checkboxLabel = t(
    isChecked ? 'policy_editor.access_package_remove' : 'policy_editor.access_package_add',
    {
      packageName: accessPackage.name,
    },
  );

  return (
    <StudioCheckbox.Group
      legend=''
      className={classes.accordionCheckbox}
      value={isChecked ? [CHECKED_VALUE] : []}
      onChange={() => handleSelectChange(accessPackage.urn)}
    >
      <StudioCheckbox value={CHECKED_VALUE} aria-label={checkboxLabel} />
    </StudioCheckbox.Group>
  );
};
