import React, { ReactNode } from 'react';
import classes from './ServiceContent.module.css';
import { Alert, ErrorMessage, Paragraph, Select, Spinner } from '@digdir/design-system-react';
import { StudioCenter } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useGetAltinn2LinkServicesQuery } from 'resourceadm/hooks/queries';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { ResourceContent } from './ResourceContent';
import { mapAltinn2LinkServiceToSelectOption } from 'resourceadm/utils/mapperUtils';

export type ServiceContentProps = {
  selectedContext: string;
  env: string;
  selectedService: Altinn2LinkService;
  onSelectService: (altinn2LinkService: Altinn2LinkService) => void;
  resourceIdExists: boolean;
};

/**
 * @component
 *    Displays the Service content in the import resource from Altinn 2 modal.
 *
 * @property {string}[selectedContext] - The selected context
 * @property {string}[env] - The selected environment
 * @property {Altinn2LinkService}[selectedService] - The selected service
 * @property {function}[onSelectService] - Function to be executed when selecting the service
 * @property {boolean}[resourceIdExists] - If the id already exists
 *
 * @returns {ReactNode} - The rendered component
 */
export const ServiceContent = ({
  selectedContext,
  env,
  selectedService,
  onSelectService,
  resourceIdExists,
}: ServiceContentProps): ReactNode => {
  const { t } = useTranslation();

  const {
    data: altinn2LinkServices,
    status: altinn2LinkServicesStatus,
    error: altinn2LinkServicesError,
  } = useGetAltinn2LinkServicesQuery(selectedContext, env);

  /**
   * Handles the selection of the service
   */
  const handleSelectService = (s: string) => {
    const valueAsArray: string[] = s.split('-');
    onSelectService({
      serviceName: valueAsArray[2],
      externalServiceEditionCode: valueAsArray[1],
      externalServiceCode: valueAsArray[0],
    });
  };

  /**
   * Return the content based on the status of the API call
   */
  switch (altinn2LinkServicesStatus) {
    case 'pending': {
      return (
        <StudioCenter className={classes.contentWrapper}>
          <Spinner
            size='xlarge'
            variant='interaction'
            title={t('resourceadm.import_resource_spinner')}
          />
        </StudioCenter>
      );
    }
    case 'error': {
      return (
        <StudioCenter className={classes.contentWrapper}>
          <Alert severity='danger'>
            <Paragraph size='small'>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph size='small'>{t('general.error_message_with_colon')}</Paragraph>
            {altinn2LinkServicesError && (
              <ErrorMessage size='small'>{altinn2LinkServicesError.message}</ErrorMessage>
            )}
          </Alert>
        </StudioCenter>
      );
    }
    case 'success': {
      if (altinn2LinkServices.length === 0) {
        return (
          <ErrorMessage className={classes.contentWrapper} size='small'>
            {t('resourceadm.import_resource_empty_list', { env: env })}
          </ErrorMessage>
        );
      }
      return (
        <div className={classes.contentWrapper}>
          <Select
            options={mapAltinn2LinkServiceToSelectOption(altinn2LinkServices)}
            onChange={handleSelectService}
            value={
              selectedService
                ? `${selectedService.externalServiceCode}-${selectedService.externalServiceEditionCode}-${selectedService.serviceName}`
                : ''
            }
            label={t('resourceadm.dashboard_import_modal_select_service')}
          />
          {selectedService && (
            <ResourceContent
              altinn2LinkService={selectedService}
              resourceIdExists={resourceIdExists}
            />
          )}
        </div>
      );
    }
  }
};
