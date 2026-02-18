import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Heading, Paragraph, Table } from '@digdir/designsystemet-react';
import { PencilIcon } from '@navikt/aksel-icons';
import { GlobalData } from 'nextsrc/core/globalData';
import { CreateInstanceButton } from 'nextsrc/features/Instantiation/components/CreateInstanceButton/createInstanceButton';
import classes from 'nextsrc/features/Instantiation/components/instanceSelection/instanceSelection.module.css';
import { routeBuilders } from 'nextsrc/routesBuilder';

import { Pagination } from 'src/app-components/Pagination/Pagination';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import type { ISimpleInstance } from 'src/types';

type InstanceListProps = {
  texts: Record<string, string>;
  instances: ISimpleInstance[];
  rowsPerPageOptions: number[];
  defaultSelectedOption: number;
};

export function InstanceList({ texts, instances, rowsPerPageOptions, defaultSelectedOption }: InstanceListProps) {
  const navigate = useNavigate();
  const mobileView = useIsMobileOrTablet();

  const [currentPage, setCurrentPage] = useState(1);

  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[defaultSelectedOption]);

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
                        color='second'
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

            {showPagination && (
              <tfoot>
                <Table.Row>
                  <Table.Cell colSpan={3}>
                    <div className={classes.paginationWrapper}>
                      <Pagination
                        id='instance-selection'
                        nextLabel={texts.next}
                        nextLabelAriaLabel={texts.next}
                        previousLabel={texts.previous}
                        previousLabelAriaLabel={texts.previous}
                        rowsPerPageText={texts.rowsPerPage}
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
                        color='second'
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
            {showPagination && (
              <tfoot>
                <Table.Row>
                  <Table.Cell colSpan={3}>
                    <div className={classes.paginationWrapper}>
                      <Pagination
                        id='instance-selection'
                        nextLabel={texts.next}
                        nextLabelAriaLabel={texts.next}
                        previousLabel={texts.previous}
                        previousLabelAriaLabel={texts.previous}
                        rowsPerPageText={texts.rowsPerPage}
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
      <CreateInstanceButton texts={{ newInstance: texts.nexInstance }} />
    </div>
  );
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
