import React, { useState } from 'react';
import classes from './MigrateResourceModal.module.css';
import { Modal } from '../Modal';
import { Button, Select } from '@digdir/design-system-react';
import { ResourceNameAndId } from '../ResourceNameAndId';

// TODO MOVE to types folder when the types are 100% agreed on.
type EnvironmentType = 'AT21' | 'AT22' | 'AT23' | 'AT24' | 'TT02' | 'PROD';
interface ServiceType {
  name: string;
}
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

const environmentOptions = ['AT21', 'AT22', 'AT23', 'AT24', 'TT02', 'PROD'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlanMigrate: () => void;
}

/**
 * Displays the modal where the user can select an environemt and service from
 * Altinn 2 to migrate to Altinn 3.
 * The user must select which environment to import from to be able to select the service.
 * The user must then selct a service before the title and id will be visible.
 * When the environment and service is selected, the button to start planning the
 * migration will be available.
 *
 * @param props.isOpen flag to decide if the modal is open or not
 * @param props.onClose function to be executed on close
 * @param props.onPlanMigrate function to be executed when the "plan migration" button is clicked
 */
export const MigrateResourceModal = ({ isOpen, onClose, onPlanMigrate }: Props) => {
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentType>();
  const [selectedService, setSelectedService] = useState<string>();
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [editIdFieldOpen, setEditIdFieldOpen] = useState(false);

  /**
   * Reset fields on close
   */
  const handleClose = () => {
    onClose();
    setSelectedEnv(undefined);
    setSelectedService(undefined);
    setId('');
    setTitle('');
    setEditIdFieldOpen(false);
  };

  /**
   * Replaces the spaces in the value typed with '-'.
   */
  const handleIDInput = (val: string) => {
    setId(val.replace(/\s/g, '-'));
  };

  /**
   * Updates the value of the title. If the edit field is not open,
   * then it updates the ID to the same as the title.
   *
   * @param val the title value typed
   */
  const handleEditTitle = (val: string) => {
    if (!editIdFieldOpen) {
      setId(val.replace(/\s/g, '-'));
    }
    setTitle(val);
  };

  /**
   * Handles the click of the edit button. If we click the edit button
   * so that it closes the edit field, the id is set to the title.
   *
   * @param isOpened the value of the button when it is pressed
   */
  const handleClickEditButton = (isOpened: boolean) => {
    setEditIdFieldOpen(isOpened);

    // If we stop editing, set the ID to the title
    if (!isOpened) {
      if (title !== id) setId(title.replace(/\s/g, '-'));
    }
  };

  const handleSelectService = (s: string) => {
    setSelectedService(s);
    handleEditTitle(s);
  };

  /**
   * Display loading (todo), the service, or nothing based on the
   * state of the selected environment
   */
  const displayService = () => {
    // If environment loading, display loading, else do below
    if (selectedEnv) {
      return (
        <div className={classes.dropdownWraper}>
          <Select
            // Replace below with the real service list from API
            options={dummyServices.map((s) => ({ value: s.name, label: s.name }))}
            onChange={handleSelectService}
            value={selectedService}
            label='Velg servicen du vil migrere'
          />
        </div>
      );
    }
    return null;
  };

  /**
   * Display loading (todo), the title and id, or nothing based on the
   * state of the selected service
   */
  const displayTitleAndId = () => {
    // If service loading, display loading, else do below
    if (selectedService) {
      return (
        <>
          <div className={classes.contentDivider} />
          <ResourceNameAndId
            isEditOpen={editIdFieldOpen}
            title={title}
            id={id}
            handleEditTitle={handleEditTitle}
            handleIdInput={handleIDInput}
            handleClickEditButton={() => handleClickEditButton(!editIdFieldOpen)}
          />
        </>
      );
    }
    return null;
  };

  // TODO - translation
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Migrer en ressurs fra Altinn II'>
      <div className={classes.dropdownWraper}>
        <Select
          options={environmentOptions.map((e) => ({ value: e, label: e }))}
          onChange={(e: EnvironmentType) => setSelectedEnv(e)}
          value={selectedEnv}
          label='Velg miljøet du vil importere fra'
        />
      </div>
      {displayService()}
      {displayTitleAndId()}
      <div className={classes.buttonWrapper}>
        <Button onClick={handleClose} color='primary' variant='quiet'>
          Avbryt
        </Button>
        {selectedEnv && selectedService && (
          <div className={classes.migrateButton}>
            <Button onClick={onPlanMigrate} color='primary'>
              Planlegg migrering
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
