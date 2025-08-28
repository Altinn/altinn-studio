import React, { forwardRef, useState } from 'react';
import { toast } from 'react-toastify';
import classes from './ImportResourceModal.module.css';
import { useTranslation } from 'react-i18next';
import type { EnvironmentType } from '../../types/EnvironmentType';
import { useNavigate } from 'react-router-dom';
import { ServiceContent } from './ServiceContent';
import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { useImportResourceFromAltinn2Mutation } from '../../hooks/mutations';
import type { Resource, ResourceError } from 'app-shared/types/ResourceAdm';
import { getResourcePageURL } from '../../utils/urlUtils';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { useUrlParams } from '../../hooks/useUrlParams';
import {
  StudioButton,
  StudioSelect,
  StudioDialog,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components';
import { formatIdString } from '../../utils/stringUtils';
import {
  getAvailableEnvironments,
  getResourceIdentifierErrorMessage,
} from '../../utils/resourceUtils';
import { ResourceAdmDialogContent } from '../ResourceAdmDialogContent/ResourceAdmDialogContent';

export type ImportResourceModalProps = {
  onClose: () => void;
};

/**
 * @component
 *    Displays the modal where the user can select an environemt and service from
 *    Altinn 2 to import to Altinn 3.
 *    The user must select which environment to import from to be able to select the service.
 *    The user must then selct a service before the title and id will be visible.
 *    When the environment and service is selected, the button to start planning the
 *    importing will be available.
 *
 * @property {function}[onClose] - Function to handle close
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ImportResourceModal = forwardRef<HTMLDialogElement, ImportResourceModalProps>(
  ({ onClose }, ref): React.JSX.Element => {
    const { t } = useTranslation();

    const { org, app } = useUrlParams();

    const navigate = useNavigate();

    const [selectedEnv, setSelectedEnv] = useState<EnvironmentType | undefined>(undefined);
    const [selectedService, setSelectedService] = useState<Altinn2LinkService | undefined>(
      undefined,
    );
    const [id, setId] = useState('');
    const [resourceIdExists, setResourceIdExists] = useState(false);

    const { mutate: importResourceFromAltinn2Mutation, isPending: isImportingResource } =
      useImportResourceFromAltinn2Mutation(org);

    const idErrorMessage = getResourceIdentifierErrorMessage(id, resourceIdExists);
    const hasValidValues =
      selectedEnv && selectedService && id.length >= 4 && !idErrorMessage && !isImportingResource;

    const environmentOptions = getAvailableEnvironments(org);

    /**
     * Reset fields on close
     */
    const handleClose = () => {
      onClose();
      setSelectedEnv(undefined);
      setSelectedService(undefined);
      setId('');
    };

    /**
     * Import the resource from Altinn 2, and navigate to about page on success
     */
    const handleImportResource = () => {
      importResourceFromAltinn2Mutation(
        {
          environment: selectedEnv,
          serviceCode: selectedService.externalServiceCode,
          serviceEdition: selectedService.externalServiceEditionCode,
          resourceId: id,
        },
        {
          onSuccess: (resource: Resource) => {
            toast.success(t('resourceadm.dashboard_import_success'));
            navigate(getResourcePageURL(org, app, resource.identifier, 'about'));
          },
          onError: (error: Error) => {
            if ((error as ResourceError).response?.status === ServerCodes.Conflict) {
              setResourceIdExists(true);
            }
          },
        },
      );
    };

    return (
      <StudioDialog ref={ref} onClose={handleClose}>
        <ResourceAdmDialogContent
          heading={t('resourceadm.dashboard_import_modal_title')}
          footer={
            <>
              <StudioButton
                onClick={() => (hasValidValues ? handleImportResource() : undefined)}
                color='first'
                aria-disabled={!hasValidValues}
              >
                {t('resourceadm.dashboard_import_modal_import_button')}
              </StudioButton>
              <StudioButton onClick={handleClose} color='first' variant='tertiary'>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          <div className={classes.importModalContent}>
            <StudioSelect
              value={selectedEnv ? selectedEnv : ''}
              label={t('resourceadm.dashboard_import_modal_select_env')}
              onChange={(event) => {
                setSelectedEnv(event.target.value as EnvironmentType);
                setSelectedService(undefined);
                setId('');
              }}
            >
              <StudioSelect.Option value={''} disabled>
                {'Velg miljø...'}
              </StudioSelect.Option>
              {environmentOptions.map((env) => (
                <StudioSelect.Option key={env.id} value={env.id}>
                  {t(env.label)}
                </StudioSelect.Option>
              ))}
            </StudioSelect>
            {selectedEnv && (
              <div>
                <ServiceContent
                  org={org}
                  env={selectedEnv}
                  selectedService={selectedService}
                  onSelectService={(altinn2LinkService: Altinn2LinkService) => {
                    setSelectedService(altinn2LinkService);
                    setId(formatIdString(altinn2LinkService.serviceName));
                  }}
                />
                {selectedService && (
                  <div>
                    <div className={classes.contentDivider} />
                    <StudioParagraph data-size='sm' spacing>
                      {t('resourceadm.dashboard_import_modal_resource_name_and_id_text')}
                    </StudioParagraph>
                    <StudioTextfield
                      label={t('resourceadm.dashboard_resource_name_and_id_resource_id')}
                      value={id}
                      onChange={(event) => {
                        setResourceIdExists(false);
                        setId(formatIdString(event.target.value));
                      }}
                      error={idErrorMessage ? t(idErrorMessage) : ''}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </ResourceAdmDialogContent>
      </StudioDialog>
    );
  },
);

ImportResourceModal.displayName = 'ImportResourceModal';
