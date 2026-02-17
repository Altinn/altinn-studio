import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Heading,
  Pagination as DesignSystemPagination,
  Paragraph,
  Table,
  usePagination,
} from '@digdir/designsystemet-react';
import { PencilIcon } from '@navikt/aksel-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { activeInstancesQuery, InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { GlobalData } from 'nextsrc/core/globalData';
import classes from 'nextsrc/features/instantiate/pages/instance-selection/InstanceSelectionPage.module.css';
import { routeBuilders } from 'nextsrc/routesBuilder';
import { useIsMobileOrTablet } from 'nextsrc/utils/useDeviceWidths';

// TODO: Replace with i18n system when language support is added to nextsrc
const texts = {
  header: 'Du har allerede startet å fylle ut dette skjemaet.',
  description:
    'Du har allerede startet å fylle ut dette skjemaet. Velg under om du vil fortsette der du slapp, eller om du vil starte på nytt.',
  leftOf: 'Fortsett der du slapp',
  lastChanged: 'Sist endret',
  changedBy: 'Endret av',
  continueHere: 'Fortsett her',
  newInstance: 'Start på nytt',
  previous: 'Forrige',
  next: 'Neste',
} as const;

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
  const partyId = GlobalData.selectedParty?.partyId;

  if (!partyId) {
    throw new Error('no party');
  }

  const { data: _instances, isPending } = useQuery(activeInstancesQuery(partyId));

  const instanceSelectionOptions = GlobalData.applicationMetadata.onEntry?.instanceSelection;

  const navigate = useNavigate();
  const mobileView = useIsMobileOrTablet();

  const rowsPerPageOptions = instanceSelectionOptions?.rowsPerPageOptions ?? [10, 25, 50];
  const selectedIndex = instanceSelectionOptions?.defaultSelectedOption;
  const defaultSelectedOption =
    selectedIndex !== undefined && selectedIndex >= 0 && selectedIndex < rowsPerPageOptions.length ? selectedIndex : 0;

  const sortDirection = instanceSelectionOptions?.sortDirection ?? 'asc';
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[defaultSelectedOption]);

  const createInstance = useMutation({
    mutationFn: async () => {
      const party = GlobalData.selectedParty;
      if (!party) {
        throw new Error('No selected party');
      }
      return InstanceApi.create(party.partyId);
    },
    onSuccess: (newInstance) => {
      const [instanceOwnerPartyId, instanceGuid] = newInstance.id.split('/');
      navigate(routeBuilders.instance({ instanceOwnerPartyId, instanceGuid }));
    },
  });

  if (isPending) {
    return <div>loading</div>;
  }

  if (!_instances?.length) {
    return <div>loading</div>;
  }
  if (_instances?.length && _instances?.length < 1) {
    throw new Error('no instances');
  }

  //
  const instances = sortDirection === 'desc' ? [..._instances].reverse() : _instances;
  const paginatedInstances = instances.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const showPagination = instances.length > rowsPerPageOptions[0];
  const totalPages = Math.ceil(instances.length / rowsPerPage);

  return (
    <div className={classes.container}>
      <Heading
        level={2}
        data-size='md'
      >
        {texts.header}
      </Heading>
      <Paragraph className={classes.descriptionParagraph}>{texts.description}</Paragraph>
      {mobileView && (
        <>
          <Heading
            data-size='xs'
            level={3}
            className={classes.leftOffHeading}
          >
            {texts.leftOf}
          </Heading>
          <Table className={classes.table}>
            <Table.Body>
              {paginatedInstances.map((instance) => (
                <Table.Row key={instance.id}>
                  <Table.Cell className={classes.mobileTableCell}>
                    <div>
                      <b>{texts.lastChanged}:</b>
                      <br />
                      <span>{getDateDisplayString(instance.lastChanged)}</span>
                    </div>
                    <div>
                      <b>{texts.changedBy}:</b>
                      <br />
                      <span>{instance.lastChangedBy}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className={classes.tableButtonWrapper}>
                      <Button
                        variant='tertiary'
                        data-color='second'
                        icon={true}
                        onClick={(ev) => handleOpenInstance(instance.id, ev, navigate)}
                        onMouseDown={(ev) => handleOpenInstance(instance.id, ev, navigate)}
                        aria-label={texts.continueHere}
                      >
                        <PencilIcon fontSize='1rem' />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}
      {!mobileView && (
        <div className={classes.tableContainer}>
          <Table className={classes.table}>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>{texts.lastChanged}</Table.HeaderCell>
                <Table.HeaderCell>{texts.changedBy}</Table.HeaderCell>
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
                        data-color='second'
                        onClick={(ev) => handleOpenInstance(instance.id, ev, navigate)}
                      >
                        {texts.continueHere}
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
          </Table>
        </div>
      )}
      {/* Pagination */}
      {showPagination && (
        <InstancePagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      )}
      {/* New instance button */}
      <div className={classes.startNewButtonContainer}>
        {createInstance.error && <p>{createInstance.error.message}</p>}
        <Button
          onClick={() => createInstance.mutate()}
          disabled={createInstance.isPending}
          data-size='md'
        >
          {createInstance.isPending ? 'Oppretter...' : texts.newInstance}
        </Button>
      </div>
    </div>
  );
};

function InstancePagination({
  currentPage,
  setCurrentPage,
  totalPages,
}: {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
}) {
  const { pages, prevButtonProps, nextButtonProps } = usePagination({
    currentPage,
    setCurrentPage,
    totalPages,
    showPages: Math.min(5, totalPages),
  });

  return (
    <div className={classes.paginationWrapper}>
      <DesignSystemPagination
        data-testid='pagination'
        aria-label='Pagination'
        data-size='sm'
      >
        <DesignSystemPagination.List>
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Button {...prevButtonProps}>{texts.previous}</DesignSystemPagination.Button>
          </DesignSystemPagination.Item>
          {pages.map(({ page, itemKey, buttonProps }) => (
            <DesignSystemPagination.Item key={itemKey}>
              {typeof page === 'number' && (
                <DesignSystemPagination.Button
                  aria-current={currentPage === page}
                  {...buttonProps}
                >
                  {page}
                </DesignSystemPagination.Button>
              )}
            </DesignSystemPagination.Item>
          ))}
          <DesignSystemPagination.Item>
            <DesignSystemPagination.Button {...nextButtonProps}>{texts.next}</DesignSystemPagination.Button>
          </DesignSystemPagination.Item>
        </DesignSystemPagination.List>
      </DesignSystemPagination>
    </div>
  );
}
