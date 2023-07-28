import React, { useState } from 'react';
import classes from './MigrateResourceModal.module.css';
import { Modal } from '../Modal';
import { Button, Select } from '@digdir/design-system-react';

// TODO MOVE
type EnvironmentType = 'AT21' | 'AT22' | 'AT23' | 'AT24' | 'TT02' | 'PROD';
interface ServiceType {
  name: string;
}
const dummyServices: ServiceType[] = [
  { name: 'Service1' },
  { name: 'Service2' },
  { name: 'Service3' },
];

const environmentOptions = [
  { value: 'AT21', label: 'AT21' },
  { value: 'AT22', label: 'AT22' },
  { value: 'AT23', label: 'AT23' },
  { value: 'AT24', label: 'AT24' },
  { value: 'TT02', label: 'TT02' },
  { value: 'PROD', label: 'PROD' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlanMigrate: () => void;
}

export const MigrateResourceModal = ({ isOpen, onClose, onPlanMigrate }: Props) => {
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentType>();
  const [selectedService, setSelectedService] = useState<string>();

  const handleClose = () => {
    onClose();
    setSelectedEnv(undefined);
    setSelectedService(undefined);
  };

  // TODO - translation
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Migrer en ressurs fra Altinn II'>
      <div className={classes.dropdownWraper}>
        <Select
          options={environmentOptions}
          onChange={(e: EnvironmentType) => setSelectedEnv(e)}
          value={selectedEnv}
          label='Velg miljøet du vil importere fra'
        />
      </div>
      {/* ONLY DISPLAY THIS ONE WHEN ENV IS SELECTED AND WE HAVE RECEIVED A LIST */}
      {/* Display loading services */}
      <div className={classes.dropdownWraper}>
        <Select
          // Replace below with the real service list from API
          options={dummyServices.map((s) => ({ value: s.name, label: s.name }))}
          onChange={(e: string) => setSelectedService(e)}
          value={selectedService}
          label='Velg servicen du vil migrere'
        />
      </div>
      {/* ONLY DISPLAY THIS ONE WHEN SERVICE IS SELECTED AND WE HAVE RECEIVED THE DETAILS */}
      {/* Display loading the service */}
      <p>Name</p>
      <p>ID</p>
      {/* DISPLAY BUTTON WRAPPER ANYWAYS */}
      <div className={classes.buttonWrapper}>
        <Button onClick={handleClose} color='primary' variant='quiet'>
          Avbryt
        </Button>
        {/* DISPLAY MIGRATE BUTTON ONLY WHEN SERVICE IS SELECTED and Name + ID is loaded */}
        <div className={classes.migrateButton}>
          <Button onClick={() => {}} color='primary'>
            Planlegg migrering
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/*
    First, the user MUST select which environment to import from (AT21, AT22, AT23, AT24, TT02, PROD)
    - Based on this selection, we will retrieve a list of the available services for that org in that environment.

    From a dropdown list, user can select a service.

    When a service is selected, the app will suggest name (same as original), and ID (based on original).
    - This can be edited (as with crate resource)

    The user needs to confirm the selection, and then frontend will call the import API (not ready).
    - This will create resource.json and policy.xml
    - Navigate to 'about' page.


    So, the modal must look like this:
    - dropdown to select environment
    - When env is selected, display dropdown with service.
    - When service is selected, display name and ID (same as for add), and a button to import
    - Display loading untill OK, then navigate to 'about'


*/
