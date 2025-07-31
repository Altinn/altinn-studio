import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useResourceAccessPackageServicesQuery } from 'app-shared/hooks/queries/useResourceAccessPackageServicesQuery';
import { StudioSpinner } from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { PolicyAccessPackageServices } from '../PolicyAccessPackageServices';
import classes from './PolicyAccessPackageAccordionContent.module.css';

type PolicyAccessPackageAccordionContentProps = {
  accessPackageResourcesEnv: 'tt02' | 'prod';
  accessPackageUrn: string;
};

export const PolicyAccessPackageAccordionContent = ({
  accessPackageResourcesEnv,
  accessPackageUrn,
}: PolicyAccessPackageAccordionContentProps): ReactElement => {
  const { t } = useTranslation();

  const { data: services, isLoading } = useResourceAccessPackageServicesQuery(
    accessPackageUrn,
    accessPackageResourcesEnv,
  );

  const hasServices: boolean = services?.length > 0;
  const serviceListIsEmpty: boolean = services?.length === 0;
  const uppercaseEnv = accessPackageResourcesEnv.toUpperCase();
  return (
    <>
      <StudioParagraph className={classes.serviceContainerHeader}>
        {t('policy_editor.access_package_services', {
          environment: uppercaseEnv,
        })}
      </StudioParagraph>
      {isLoading && (
        <StudioSpinner spinnerTitle={t('policy_editor.access_package_loading_services')} />
      )}
      {hasServices && <PolicyAccessPackageServices services={services} />}
      {serviceListIsEmpty && (
        <StudioParagraph data-size='xs'>
          {t('policy_editor.access_package_no_services', {
            environment: uppercaseEnv,
          })}
        </StudioParagraph>
      )}
    </>
  );
};
