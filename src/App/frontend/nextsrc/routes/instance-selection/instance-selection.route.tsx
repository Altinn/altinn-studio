import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { Heading, Paragraph, Table } from '@digdir/designsystemet-react';
import { PencilIcon } from '@navikt/aksel-icons';
import { Button } from 'nextsrc/core/components/Button/Button';
import { Pagination } from 'nextsrc/core/components/Pagination/Pagination';
import { GlobalData } from 'nextsrc/core/globalData';
import { useIsMobileOrTablet } from 'nextsrc/core/hooks/useDeviceWidths';
import {
  extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId,
  useActiveInstances,
  useCreateInstance,
} from 'nextsrc/core/queries/instance';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import classes from 'nextsrc/routes/instance-selection/instance-selection.route.module.css';
import { routeBuilders } from 'nextsrc/routesBuilder';

import type { ISimpleInstance } from 'src/types';

function getDateDisplayString(timeStamp: string): string {
  let date = new Date(timeStamp);
  const offset = date.getTimezoneOffset();
  date = new Date(date.getTime() - offset * 60 * 1000);
  const locale = window.navigator?.language || 'nb-NO';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function openInTab(url: string, originalEvent: React.MouseEvent<HTMLButtonElement>) {
  const link = document.createElement('a');
  link.href = url;
  // eslint-disable-next-line no-undef
  const options: MouseEventInit = {
    button: originalEvent.button,
    buttons: originalEvent.buttons,
    ctrlKey: originalEvent.ctrlKey,
    metaKey: originalEvent.metaKey,
    shiftKey: originalEvent.shiftKey,
  };
  link.dispatchEvent(new MouseEvent(originalEvent.type, options));
}

function handleOpenInstance(
  instanceId: string,
  event: React.MouseEvent<HTMLButtonElement>,
  navigate: ReturnType<typeof useNavigate>,
) {
  if (event.ctrlKey || event.metaKey || event.button === 1) {
    event.stopPropagation();
    event.preventDefault();
    openInTab(`${GlobalData.basename}/instance/${instanceId}`, event);
    return;
  }

  if (event.type !== 'click') {
    return;
  }

  const [instanceOwnerPartyId, instanceGuid] = instanceId.split('/');
  navigate(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
}

export const InstanceSelectionPage = () => {
  const { langAsString } = useLanguage();
  const selectedPartyId = GlobalData.selectedParty?.partyId;

  if (!selectedPartyId) {
    throw new Error('no party');
  }

  const instanceSelectionOptions = GlobalData.applicationMetadata.onEntry?.instanceSelection;

  const navigate = useNavigate();
  const mobileView = useIsMobileOrTablet();

  const rowsPerPageOptions = instanceSelectionOptions?.rowsPerPageOptions ?? [10, 25, 50];
  const selectedIndex = instanceSelectionOptions?.defaultSelectedOption;
  const defaultSelectedOption =
    selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < rowsPerPageOptions.length ? selectedIndex : 0;

  const sortDirection = instanceSelectionOptions?.sortDirection ?? 'asc';
  const { data: instances, isPending } = useActiveInstances({
    instanceOwnerPartyId: selectedPartyId.toString(),
    sortDirection,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[defaultSelectedOption]);

  if (isPending) {
    return <div>loading</div>;
  }

  if (!instances?.length) {
    return <div>loading</div>;
  }
  if (instances?.length && instances?.length < 1) {
    throw new Error('no instances');
  }

  const paginatedInstances = instances.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const showPagination = instances.length > rowsPerPageOptions[0];

  function handleRowsPerPageChanged(newRowsPerPage: number, instances: ISimpleInstance[]) {
    setRowsPerPage(newRowsPerPage);
    if (instances.length < (currentPage - 1) * newRowsPerPage) {
      setCurrentPage(Math.floor(instances.length / newRowsPerPage));
    }
  }

  return (
    <div
      className={classes.container}
      id='instance-selection-container'
    >
      <Heading
        level={2}
        data-size='md'
      >
        {langAsString('instance_selection.header')}
      </Heading>
      <Paragraph className={classes.descriptionParagraph}>{langAsString('instance_selection.description')}</Paragraph>
      {mobileView && (
        <>
          <Heading
            data-size='xs'
            level={3}
            className={classes.leftOffHeading}
          >
            {langAsString('instance_selection.left_of')}
          </Heading>
          <Table className={classes.table}>
            <Table.Body>
              {paginatedInstances.map((instance) => (
                <Table.Row key={instance.id}>
                  <Table.Cell className={classes.mobileTableCell}>
                    <div>
                      <b>{langAsString('instance_selection.last_changed')}:</b>
                      <br />
                      <span>{getDateDisplayString(instance.lastChanged)}</span>
                    </div>
                    <div>
                      <b>{langAsString('instance_selection.changed_by')}:</b>
                      <br />
                      <span>{instance.lastChangedBy}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className={classes.tableButtonWrapper}>
                      <Button
                        variant='tertiary'
                        color='second'
                        icon={true}
                        onClick={(ev) => handleOpenInstance(instance.id, ev, navigate)}
                        onMouseDown={(ev) => handleOpenInstance(instance.id, ev, navigate)}
                        aria-label={langAsString('instance_selection.continue')}
                      >
                        <PencilIcon fontSize='1rem' />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>

            {showPagination && (
              <tfoot>
                <Table.Row>
                  <Table.Cell colSpan={3}>
                    <div className={classes.paginationWrapper}>
                      <Pagination
                        id='instance-selection'
                        nextLabel={langAsString('general.next')}
                        nextLabelAriaLabel={langAsString('general.next')}
                        previousLabel={langAsString('general.previous')}
                        previousLabelAriaLabel={langAsString('general.previous')}
                        rowsPerPageText={langAsString('general.rows_per_page')}
                        size='sm'
                        numberOfRows={instances.length}
                        showRowsPerPageDropdown={true}
                        rowsPerPageOptions={rowsPerPageOptions}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        pageSize={rowsPerPage}
                        onPageSizeChange={(value) => handleRowsPerPageChanged(value, instances)}
                      />
                    </div>
                  </Table.Cell>
                </Table.Row>
              </tfoot>
            )}
          </Table>
        </>
      )}
      {!mobileView && (
        <div className={classes.tableContainer}>
          <Table className={classes.table}>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>{langAsString('instance_selection.last_changed')}</Table.HeaderCell>
                <Table.HeaderCell>{langAsString('instance_selection.changed_by')}</Table.HeaderCell>
                <Table.HeaderCell />
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {paginatedInstances.map((instance) => (
                <Table.Row key={instance.id}>
                  <Table.Cell>{getDateDisplayString(instance.lastChanged)}</Table.Cell>
                  <Table.Cell>{instance.lastChangedBy}</Table.Cell>
                  <Table.Cell className={classes.buttonCell}>
                    <div className={classes.tableButtonWrapper}>
                      <Button
                        variant='tertiary'
                        color='second'
                        onClick={(ev) => handleOpenInstance(instance.id, ev, navigate)}
                      >
                        {langAsString('instance_selection.continue')}
                        <PencilIcon
                          fontSize='1rem'
                          aria-hidden
                        />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
            {showPagination && (
              <tfoot>
                <Table.Row>
                  <Table.Cell colSpan={3}>
                    <div className={classes.paginationWrapper}>
                      <Pagination
                        id='instance-selection'
                        nextLabel={langAsString('general.next')}
                        nextLabelAriaLabel={langAsString('general.next')}
                        previousLabel={langAsString('general.previous')}
                        previousLabelAriaLabel={langAsString('general.previous')}
                        rowsPerPageText={langAsString('general.rows_per_page')}
                        size='sm'
                        numberOfRows={instances.length}
                        showRowsPerPageDropdown={true}
                        rowsPerPageOptions={rowsPerPageOptions}
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        pageSize={rowsPerPage}
                        onPageSizeChange={(value) => handleRowsPerPageChanged(value, instances)}
                      />
                    </div>
                  </Table.Cell>
                </Table.Row>
              </tfoot>
            )}
          </Table>
        </div>
      )}
      <CreateInstanceButton />
    </div>
  );
};

function CreateInstanceButton() {
  const { langAsString } = useLanguage();
  const navigate = useNavigate();
  const createInstanceMutation = useCreateInstance();

  return (
    <div className={classes.startNewButtonContainer}>
      {createInstanceMutation.error && <p>{createInstanceMutation.error.message}</p>}
      <Button
        onClick={async () => {
          const result = await createInstanceMutation.mutateAsync();

          const { instanceGuid, instanceOwnerPartyId } = extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId(
            result.id,
          );

          return navigate(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
        }}
        disabled={createInstanceMutation.isPending}
        size='md'
      >
        {createInstanceMutation.isPending ? 'Oppretter...' : langAsString('instance_selection.new_instance')}
      </Button>
    </div>
  );
}
