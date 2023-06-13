import React, { useState } from 'react';
import classes from './ResourceTable.module.css';
import { CaretDownFillIcon, CaretUpFillIcon } from '@navikt/aksel-icons';
import { ResourceTableDataRow } from './ResourceTableDataRow';
import { Button } from '@digdir/design-system-react';
import { ResourceType } from 'resourceadm/types/global';
import { VerificationModal } from '../VerificationModal';

interface Props {
  list: ResourceType[];
  isSortedByNewest: boolean;
  updateTable: (res: ResourceType[]) => void;
}

/**
 * Table to display a list of all resources available
 *
 * @param props.list the list to display in the table
 * @param props.isSortedByNewest flag for which way to sort the list
 */
export const ResourceTable = ({ list, isSortedByNewest, updateTable }: Props) => {
  // To keep track of which rule to delete
  const [resourceIdToDelete, setResourceIdToDelete] = useState('0');
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  const handleDeleteResource = (resourceId: string) => {
    const updatedResources = [...list];
    const indexToRemove = updatedResources.findIndex(
      (resource: ResourceType) => resource.resourceId === resourceId
    );
    updatedResources.splice(indexToRemove, 1);

    // Update the table after deletion
    updateTable(updatedResources);

    // Reset
    setVerificationModalOpen(false);
    setResourceIdToDelete('0');

    // TODO - Delete API call
  };

  /**
   * Displays a row for each resource in the list
   */
  const displayRows = list.map((resource: ResourceType, key: number) => {
    return (
      <ResourceTableDataRow
        key={key}
        resource={resource}
        handleRemoveElement={() => {
          setVerificationModalOpen(true);
          setResourceIdToDelete(resource.resourceId);
        }}
      />
    );
  });

  // TODO - translate
  return (
    <table className={classes.table}>
      <tbody>
        <tr>
          <th className={`${classes.tableHeaderLarge} ${classes.tableHeader}`}>
            <p className={classes.tableHeaderText}>Ressurser</p>
          </th>
          <th className={`${classes.tableHeaderLarge} ${classes.tableHeader}`}>
            <p className={classes.tableHeaderText}>Opprettet av</p>
          </th>
          <th className={`${classes.tableHeaderMedium} ${classes.tableHeaderLastChanged}`}>
            <Button
              variant='quiet'
              icon={
                isSortedByNewest ? (
                  <CaretDownFillIcon title='Vis eldst først' />
                ) : (
                  <CaretUpFillIcon title='Vis nyest først' />
                )
              }
              iconPlacement='right'
              color='secondary'
            >
              Sist endret
            </Button>
          </th>
          <th className={`${classes.tableHeaderMedium} ${classes.tableHeader}`}>
            <p className={classes.tableHeaderText}>Policy</p>
          </th>
          <th
            className={`${classes.tableHeaderMedium} ${classes.tableHeader}`}
            aria-label='Rediger ressurs kolonne'
          />
          <th
            className={`${classes.tableHeaderSmall} ${classes.tableHeader}`}
            aria-label='Se flere valg for ressursen'
          />
        </tr>
        {displayRows}
      </tbody>
      <VerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        text='Er du sikker på at du vil slette denne ressursen?'
        closeButtonText='Nei, gå tilbake'
        actionButtonText='Ja, slett ressurs'
        onPerformAction={() => handleDeleteResource(resourceIdToDelete)}
      />
    </table>
  );
};
