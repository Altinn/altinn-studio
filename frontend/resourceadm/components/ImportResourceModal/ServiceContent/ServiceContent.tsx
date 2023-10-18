import React, { ReactNode, useState } from 'react';
import classes from './ServiceContent.module.css';
import { Alert, ErrorMessage, Paragraph, Select, Spinner } from '@digdir/design-system-react';
import { Center } from 'app-shared/components/Center';
import { useTranslation } from 'react-i18next';
import { useGetAltinn2LinkServicesQuery } from 'resourceadm/hooks/queries';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { ResourceContent } from './ResourceContent';

export type ServiceContentProps = {
  selectedContext: string;
  env: string;
  selectedService: Altinn2LinkService;
  onSelectService: (a2ls: Altinn2LinkService) => void;
};

export const ServiceContent = ({
  selectedContext,
  env,
  selectedService,
  onSelectService,
}: ServiceContentProps): ReactNode => {
  const { t } = useTranslation();

  const {
    data: altinn2LinkServices,
    status: altinn2LinkServicesStatus,
    error: altinn2LinkServicesError,
  } = useGetAltinn2LinkServicesQuery(selectedContext, env);

  const handleSelectService = (s: string) => {
    const valueAsArray: string[] = s.split('-');
    onSelectService({
      serviceName: valueAsArray[2],
      externalServiceEditionCode: Number(valueAsArray[1]),
      externalServiceCode: valueAsArray[0],
    });
  };

  const mapAltinn2LinkServiceToSelectOption = (linkServices: Altinn2LinkService[]) => {
    return linkServices.map((ls: Altinn2LinkService) => ({
      value: `${ls.externalServiceCode}-${ls.externalServiceEditionCode}-${ls.serviceName}`,
      label: `${ls.externalServiceCode}-${ls.externalServiceEditionCode}-${ls.serviceName}`,
    }));
  };

  switch (altinn2LinkServicesStatus) {
    case 'loading': {
      return (
        <Center className={classes.contentWrapper}>
          <Spinner
            size='2xLarge'
            variant='interaction'
            title={t('resourceadm.import_resource_spinner')}
          />{' '}
        </Center>
      );
    }
    case 'error': {
      return (
        <Center className={classes.contentWrapper}>
          <Alert severity='danger'>
            <Paragraph size='small'>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph size='small'>{t('general.error_message_with_colon')}</Paragraph>
            {altinn2LinkServicesError && (
              <ErrorMessage size='small'>{altinn2LinkServicesError.message}</ErrorMessage>
            )}
          </Alert>
        </Center>
      );
    }
    case 'success': {
      if (altinn2LinkServices.length === 0) {
        return (
          <ErrorMessage className={classes.contentWrapper} size='small'>
            {t('resourceadm.import_resource_empty_list')}
          </ErrorMessage>
        );
      }
      return (
        <div className={classes.contentWrapper}>
          <Select
            options={mapAltinn2LinkServiceToSelectOption(altinn2LinkServices)}
            onChange={handleSelectService}
            value={`${selectedService.externalServiceCode}-${selectedService.externalServiceEditionCode}-${selectedService.serviceName}`}
            label={t('resourceadm.dashboard_import_modal_select_service')}
          />
          <ResourceContent altinn2LinkService={selectedService} />
        </div>
      );
    }
  }
};
