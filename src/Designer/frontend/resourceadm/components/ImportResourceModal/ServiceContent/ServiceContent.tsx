import type { ReactNode } from 'react';
import React from 'react';
import classes from './ServiceContent.module.css';
import {
  StudioAlert,
  StudioCenter,
  StudioCombobox,
  StudioErrorMessage,
  StudioParagraph,
  StudioSpinner,
} from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useGetAltinn2LinkServicesQuery } from '../../../hooks/queries';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import {
  mapAltinn2LinkServiceToSelectOption,
  mapSelectOptiontoAltinn2LinkService,
} from '../../../utils/mapperUtils';

export type ServiceContentProps = {
  org: string;
  env: string;
  selectedService: Altinn2LinkService | undefined;
  onSelectService: (altinn2LinkService: Altinn2LinkService | undefined) => void;
};

/**
 * @component
 *    Displays the Service content in the import resource from Altinn 2 modal.
 *
 * @property {string}[org] - The selected org
 * @property {string}[env] - The selected environment
 * @property {Altinn2LinkService | undefined}[selectedService] - The selected service
 * @property {function}[onSelectService] - Function to be executed when selecting the service
 *
 * @returns {ReactNode} - The rendered component
 */
export const ServiceContent = ({
  org,
  env,
  selectedService,
  onSelectService,
}: ServiceContentProps): ReactNode => {
  const { t } = useTranslation();

  const {
    data: altinn2LinkServices,
    status: altinn2LinkServicesStatus,
    error: altinn2LinkServicesError,
  } = useGetAltinn2LinkServicesQuery(org, env);

  /**
   * Handles the selection of the service
   */
  const handleSelectService = (s: string) => {
    const linkService = s ? mapSelectOptiontoAltinn2LinkService(s) : undefined;
    onSelectService(linkService);
  };

  /**
   * Return the content based on the status of the API call
   */
  switch (altinn2LinkServicesStatus) {
    case 'pending': {
      return (
        <StudioCenter className={classes.contentWrapper}>
          <StudioSpinner
            size='xl'
            variant='interaction'
            spinnerTitle={t('resourceadm.import_resource_spinner')}
          />
        </StudioCenter>
      );
    }
    case 'error': {
      return (
        <StudioCenter className={classes.contentWrapper}>
          <StudioAlert severity='danger'>
            <StudioParagraph size='sm'>{t('general.fetch_error_message')}</StudioParagraph>
            <StudioParagraph size='sm'>{t('general.error_message_with_colon')}</StudioParagraph>
            {altinn2LinkServicesError && (
              <StudioErrorMessage size='sm'>{altinn2LinkServicesError.message}</StudioErrorMessage>
            )}
          </StudioAlert>
        </StudioCenter>
      );
    }
    case 'success': {
      if (altinn2LinkServices.length === 0) {
        return (
          <StudioErrorMessage className={classes.contentWrapper} size='sm'>
            {t('resourceadm.import_resource_empty_list', { env: env })}
          </StudioErrorMessage>
        );
      }
      return (
        <StudioCombobox
          portal={false}
          value={
            selectedService
              ? [mapAltinn2LinkServiceToSelectOption(selectedService).value]
              : undefined
          }
          label={t('resourceadm.dashboard_import_modal_select_service')}
          onValueChange={(newValue: string[]) => {
            handleSelectService(newValue[0]);
          }}
          filter={(inputValue: string, option) =>
            option.label.toLowerCase().indexOf(inputValue?.toLowerCase()) > -1
          }
        >
          <StudioCombobox.Empty>
            {t('resourceadm.dashboard_import_modal_no_services_found')}
          </StudioCombobox.Empty>
          {altinn2LinkServices.map(mapAltinn2LinkServiceToSelectOption).map((ls) => (
            <StudioCombobox.Option key={ls.value} value={ls.value}>
              {ls.label}
            </StudioCombobox.Option>
          ))}
        </StudioCombobox>
      );
    }
  }
};
