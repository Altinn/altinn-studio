import React, { ReactNode } from 'react';
import classes from './ServiceContent.module.css';
import { Alert, ErrorMessage, Paragraph, Select, Spinner } from '@digdir/design-system-react';
import { Center } from 'app-shared/components/Center';
import { useTranslation } from 'react-i18next';
import { useGetAltinn2LinkServicesQuery } from 'resourceadm/hooks/queries';
import { ServiceType } from 'resourceadm/types/global';

const dummyServices: ServiceType[] = [
  { name: 'Service1' },
  { name: 'Service2' },
  { name: 'Service3' },
  { name: 'Service4' },
  { name: 'Service5' },
  { name: 'Service6' },
  { name: 'Service7' },
  { name: 'Service8' },
  { name: 'Service9' },
];

export type ServiceContentProps = {
  selectedContext: string;
  env: string;
  selectedService: string;
  onSelectService: (s: string) => void;
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

  console.log(altinn2LinkServices);

  const handleSelectService = (s: string) => {
    onSelectService(s);
  };

  switch (altinn2LinkServicesStatus) {
    case 'loading': {
      console.log('loading...');

      return (
        <Center className={classes.dropdownWrapper}>
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
        <Center className={classes.dropdownWrapper}>
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
      console.log(altinn2LinkServices);
      return (
        <div className={classes.dropdownWraper}>
          <Select
            options={dummyServices.map((s) => ({ value: s.name, label: s.name }))}
            onChange={handleSelectService}
            value={selectedService}
            label={t('resourceadm.dashboard_import_modal_select_service')}
          />
        </div>
      );
    }
  }
};
