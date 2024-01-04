import React, { useState } from 'react';
import classes from './ImportResourceModal.module.css';
import { Modal } from '../Modal';
import { Button, LegacySelect } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { EnvironmentType } from 'resourceadm/types/EnvironmentType';
import { useNavigate, useParams } from 'react-router-dom';
import { ServiceContent } from './ServiceContent';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { useImportResourceFromAltinn2Mutation } from 'resourceadm/hooks/mutations';
import { Resource } from 'app-shared/types/ResourceAdm';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { AxiosError } from 'axios';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

const environmentOptions = ['AT21', 'AT22', 'AT23', 'AT24', 'TT02', 'PROD'];

export type ImportResourceModalProps = {
  isOpen: boolean;
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
 * @property {boolean}[isOpen] - Boolean for if the modal is open
 * @property {function}[onClose] - Function to handle close
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ImportResourceModal = ({
  isOpen,
  onClose,
}: ImportResourceModalProps): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const navigate = useNavigate();

  const [selectedEnv, setSelectedEnv] = useState<EnvironmentType>();
  const [selectedService, setSelectedService] = useState<Altinn2LinkService>();

  const [resourceIdExists, setResourceIdExists] = useState(false);

  const { mutate: importResourceFromAltinn2Mutation } =
    useImportResourceFromAltinn2Mutation(selectedContext);

  /**
   * Reset fields on close
   */
  const handleClose = () => {
    onClose();
    setSelectedEnv(undefined);
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
      },
      {
        onSuccess: (resource: Resource) => {
          navigate(getResourcePageURL(selectedContext, repo, resource.identifier, 'about'));
        },
        onError: (error: AxiosError) => {
          if (error.response.status === ServerCodes.Conflict) {
            setResourceIdExists(true);
          }
        },
      },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('resourceadm.dashboard_import_modal_title')}
      contentClassName={classes.contentWidth}
    >
      <div className={classes.dropdownWraper}>
        <LegacySelect
          options={environmentOptions.map((e) => ({ value: e, label: e }))}
          onChange={(e: EnvironmentType) => setSelectedEnv(e)}
          value={selectedEnv}
          label={t('resourceadm.dashboard_import_modal_select_env')}
        />
      </div>
      {selectedEnv && (
        <ServiceContent
          selectedContext={selectedContext}
          env={selectedEnv}
          selectedService={selectedService}
          onSelectService={(altinn2LinkService: Altinn2LinkService) =>
            setSelectedService(altinn2LinkService)
          }
          resourceIdExists={resourceIdExists}
        />
      )}
      <div className={classes.buttonWrapper}>
        <Button onClick={handleClose} color='first' variant='tertiary' size='small'>
          {t('general.cancel')}
        </Button>
        {selectedEnv && selectedService && (
          <div className={classes.importButton}>
            <Button onClick={handleImportResource} color='first' size='small'>
              {t('resourceadm.dashboard_import_modal_import_button')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
