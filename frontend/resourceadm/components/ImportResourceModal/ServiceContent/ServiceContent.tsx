import type { ReactNode } from 'react';
import React from 'react';
import classes from './ServiceContent.module.css';
import { Alert, ErrorMessage, Combobox, Paragraph, Spinner } from '@digdir/design-system-react';
import { StudioCenter } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useGetAltinn2LinkServicesQuery } from '../../../hooks/queries';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { mapAltinn2LinkServiceToSelectOption } from '../../../utils/mapperUtils';

export type ServiceContentProps = {
  selectedContext: string;
  env: string;
  selectedService: Altinn2LinkService;
  onSelectService: (altinn2LinkService: Altinn2LinkService) => void;
};

/**
 * @component
 *    Displays the Service content in the import resource from Altinn 2 modal.
 *
 * @property {string}[selectedContext] - The selected context
 * @property {string}[env] - The selected environment
 * @property {Altinn2LinkService}[selectedService] - The selected service
 * @property {function}[onSelectService] - Function to be executed when selecting the service
 *
 * @returns {ReactNode} - The rendered component
 */
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
        <Combobox
          value={
            selectedService
              ? mapAltinn2LinkServiceToSelectOption([selectedService]).map((ls) => ls.value)
              : undefined
          }
          label={t('resourceadm.dashboard_import_modal_select_service')}
          onValueChange={(newValue: string[]) => {
            if (newValue?.length) {
              handleSelectService(newValue[0]);
            }
          }}
        >
          {mapAltinn2LinkServiceToSelectOption(altinn2LinkServices).map((ls) => {
            return (
              <Combobox.Option key={ls.value} value={ls.value}>
                {ls.label}
              </Combobox.Option>
            );
          })}
        </Combobox>
      );
    }
  }
};
