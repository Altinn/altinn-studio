import React, { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useResourceAccessPackageServicesQuery } from 'app-shared/hooks/queries/useResourceAccessPackageServicesQuery';
import { StudioParagraph, StudioSelect, StudioSpinner } from '@studio/components';
import { PolicyAccessPackageServices } from '../PolicyAccessPackageServices';
import classes from './PolicyAccessPackageAccordionContent.module.css';
import type { CompetentAuthority } from 'app-shared/types/PolicyAccessPackages';

type PolicyAccessPackageAccordionContentProps = {
  accessPackageUrn: string;
};

export const PolicyAccessPackageAccordionContent = ({
  accessPackageUrn,
}: PolicyAccessPackageAccordionContentProps): ReactElement => {
  const { t } = useTranslation();
  const [selectedEnv, setSelectedEnv] = useState<'tt02' | 'prod'>('tt02');
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  const { data: services, isLoading } = useResourceAccessPackageServicesQuery(
    accessPackageUrn,
    selectedEnv,
  );

  const hasServices: boolean = services?.length > 0;
  const serviceListIsEmpty: boolean = services?.length === 0;
  const uppercaseEnv = selectedEnv.toUpperCase();

  const groupedServiceOwners = services?.reduce((acc: CompetentAuthority[], service) => {
    const hasOrg = acc.some((org) => org.orgcode === service.hasCompetentAuthority?.orgcode);
    return hasOrg ? acc : [...acc, service.hasCompetentAuthority];
  }, []);

  const filteredServices = selectedOrg
    ? services?.filter((service) => service.hasCompetentAuthority?.orgcode === selectedOrg)
    : services;

  const handleChangeEnv = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEnv(event.target.value as 'tt02' | 'prod');
  };

  const handleChangeOrg = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOrg(event.target.value);
  };

  useEffect(() => {
    if (services?.length > 0 && filteredServices?.length === 0) {
      setSelectedOrg(''); // Reset selected org when environment changes if org has no services in new selected environment
    }
  }, [services, filteredServices]);

  return (
    <>
      <StudioParagraph className={classes.serviceContainerHeader}>
        {t('policy_editor.access_package_services')}
      </StudioParagraph>
      <div className={classes.selectWrapper}>
        <StudioSelect
          label=''
          aria-label={t('policy_editor.access_package_select_env')}
          value={selectedEnv}
          onChange={handleChangeEnv}
        >
          <StudioSelect.Option value='tt02'>
            {t('policy_editor.access_package_environment_tt02')}
          </StudioSelect.Option>
          <StudioSelect.Option value='prod'>
            {t('policy_editor.access_package_environment_prod')}
          </StudioSelect.Option>
        </StudioSelect>
        <StudioSelect
          label=''
          aria-label={t('policy_editor.access_package_select_org')}
          value={selectedOrg}
          onChange={handleChangeOrg}
        >
          <StudioSelect.Option value={''}>
            {t('policy_editor.access_package_all_service_owners')}
          </StudioSelect.Option>
          {groupedServiceOwners?.map((serviceOwner) => (
            <StudioSelect.Option key={serviceOwner.orgcode} value={serviceOwner.orgcode}>
              {serviceOwner.name.nb ?? serviceOwner.orgcode}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      </div>
      {isLoading && (
        <StudioSpinner aria-label={t('policy_editor.access_package_loading_services')} />
      )}
      {hasServices && <PolicyAccessPackageServices services={filteredServices} />}
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
