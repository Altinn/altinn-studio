import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useResourceAccessPackageServicesQuery } from 'app-shared/hooks/queries/useResourceAccessPackageServicesQuery';
import { StudioParagraph, StudioSpinner } from '@studio/components-legacy';
import { PolicyAccessPackageServices } from '../PolicyAccessPackageServices';

type PolicyAccessPackageAccordionContentProps = { accessPackageUrn: string };

export const PolicyAccessPackageAccordionContent = ({
  accessPackageUrn,
}: PolicyAccessPackageAccordionContentProps): ReactElement => {
  const { t } = useTranslation();
  // Determine enviroment to load resources/apps connected to each access packages from. Option to override this
  // value with a localStorage setting is for testing. Valid options are 'at22', 'at23', 'at24', 'tt02'
  const accessPackageResourcesEnv = localStorage.getItem('accessPackageResourcesEnv') || 'prod';

  const { data: services, isLoading } = useResourceAccessPackageServicesQuery(
    accessPackageUrn,
    accessPackageResourcesEnv,
  );

  const hasServices: boolean = services?.length > 0;
  const serviceListIsEmpty: boolean = services?.length === 0;
  return (
    <>
      {isLoading && (
        <StudioSpinner spinnerTitle={t('policy_editor.access_package_loading_services')} />
      )}
      {hasServices && <PolicyAccessPackageServices services={services} />}
      {serviceListIsEmpty && (
        <StudioParagraph size='xs'>{t('policy_editor.access_package_no_services')}</StudioParagraph>
      )}
    </>
  );
};
