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
  StudioCombobox,
  StudioModal,
  StudioParagraph,
  StudioTextfield,
} from '@studio/components-legacy';
import { formatIdString } from '../../utils/stringUtils';
import {
  getAvailableEnvironments,
  getResourceIdentifierErrorMessage,
} from '../../utils/resourceUtils';

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
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={ref}
          closeButtonTitle={t('resourceadm.close_modal')}
          heading={t('resourceadm.dashboard_import_modal_title')}
          className={classes.importModal}
          contentClassName={classes.importModalContent}
          onClose={handleClose}
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
          <StudioCombobox
            portal={false}
            value={selectedEnv ? [selectedEnv] : undefined}
            label={t('resourceadm.dashboard_import_modal_select_env')}
            onValueChange={(newValue: EnvironmentType[]) => {
              setSelectedEnv(newValue[0]);
              setSelectedService(undefined);
              setId('');
            }}
          >
            {environmentOptions.map((env) => (
              <StudioCombobox.Option key={env.id} value={env.id}>
                {t(env.label)}
              </StudioCombobox.Option>
            ))}
          </StudioCombobox>
          {selectedEnv && (
            <div>
              <ServiceContent
                org={org}
                env={selectedEnv}
                selectedService={selectedService}
                onSelectService={(altinn2LinkService: Altinn2LinkService) => {
                  setSelectedService(altinn2LinkService);
                  setId(altinn2LinkService ? formatIdString(altinn2LinkService.serviceName) : '');
                }}
              />
              {selectedService && (
                <div>
                  <div className={classes.contentDivider} />
                  <StudioParagraph size='sm' spacing>
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
        </StudioModal.Dialog>
      </StudioModal.Root>
    );
  },
);

ImportResourceModal.displayName = 'ImportResourceModal';
