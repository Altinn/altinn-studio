import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Heading, Paragraph, Table } from '@digdir/designsystemet-react';
import { PencilIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import { Pagination } from 'src/app-components/Pagination/Pagination';
import { ErrorListFromInstantiation, ErrorReport } from 'src/components/message/ErrorReport';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import {
  ActiveInstancesProvider,
  useActiveInstances,
} from 'src/features/instantiate/selection/ActiveInstancesProvider';
import classes from 'src/features/instantiate/selection/InstanceSelection.module.css';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useSetNavigationEffect } from 'src/features/navigation/NavigationEffectContext';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { useIsMobileOrTablet } from 'src/hooks/useDeviceWidths';
import { focusMainContent } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import { getPageTitle } from 'src/utils/getPageTitle';
import { getInstanceUiUrl } from 'src/utils/urls/appUrlHelper';
import type { ISimpleInstance } from 'src/types';

function getDateDisplayString(timeStamp: string) {
  let date = new Date(timeStamp);
  const offset = date.getTimezoneOffset();
  date = new Date(date.getTime() - offset * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const locale = window.navigator?.language || (window.navigator as any)?.userLanguage || 'nb-NO';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export const InstanceSelectionWrapper = () => (
  <ActiveInstancesProvider>
    <PresentationComponent
      type={ProcessTaskType.Unknown}
      showNavigation={false}
    >
      <InstanceSelection />
    </PresentationComponent>
  </ActiveInstancesProvider>
);

function InstanceSelection() {
  const _instances = useActiveInstances();
  const applicationMetadata = useApplicationMetadata();
  const instanceSelectionOptions = applicationMetadata?.onEntry.instanceSelection;
  const selectedIndex = instanceSelectionOptions?.defaultSelectedOption;
  const { langAsString } = useLanguage();
  const mobileView = useIsMobileOrTablet();
  const rowsPerPageOptions = instanceSelectionOptions?.rowsPerPageOptions ?? [10, 25, 50];
  const instantiation = useInstantiation();
  const selectedParty = useSelectedParty();
  const setNavigationEffect = useSetNavigationEffect();
  const { performProcess, isAnyProcessing, isThisProcessing: isLoading } = useIsProcessing();
  const navigate = useNavigate();

  const appName = useAppName();
  const appOwner = useAppOwner();

  const doesIndexExist = (selectedIndex: number | undefined): selectedIndex is number =>
    selectedIndex !== undefined && rowsPerPageOptions.length - 1 >= selectedIndex && selectedIndex >= 0;

  const defaultSelectedOption = doesIndexExist(selectedIndex) ? selectedIndex : 0;
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[defaultSelectedOption]);

  const instances = instanceSelectionOptions?.sortDirection === 'desc' ? [..._instances].reverse() : _instances;
  const paginatedInstances = instances.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function handleRowsPerPageChanged(newRowsPerPage: number) {
    setRowsPerPage(newRowsPerPage);
    if (instances.length < (currentPage - 1) * newRowsPerPage) {
      setCurrentPage(Math.floor(instances.length / newRowsPerPage));
    }
  }

  const renderMobileTable = () => (
    <>
      <Heading
        data-size='xs'
        level={3}
        className={classes.leftOffHeading}
      >
        <Lang id='instance_selection.left_of' />
      </Heading>
      <Table
        id='instance-selection-mobile-table'
        className={classes.table}
      >
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
                    onClick={(ev) => openInstance(instance.id, ev, navigate, setNavigationEffect)}
                    onMouseDown={(ev) => openInstance(instance.id, ev, navigate, setNavigationEffect)}
                    aria-label={`${langAsString('instance_selection.continue')}`}
                  >
                    <PencilIcon fontSize='1rem' />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        {instances.length > rowsPerPageOptions[0] && (
          <tfoot>
            <Table.Row>
              <Table.Cell colSpan={2}>
                <div className={classes.paginationWrapperMobile}>
                  <Pagination
                    id='instance-selection'
                    nextLabel={langAsString('list_component.nextPage')}
                    nextLabelAriaLabel={langAsString('list_component.nextPageAriaLabel')}
                    previousLabel={langAsString('list_component.previousPage')}
                    previousLabelAriaLabel={langAsString('list_component.previousPageAriaLabel')}
                    rowsPerPageText={langAsString('list_component.rowsPerPage')}
                    size='sm'
                    numberOfRows={instances.length}
                    showRowsPerPageDropdown={true}
                    rowsPerPageOptions={rowsPerPageOptions}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    pageSize={rowsPerPage}
                    onPageSizeChange={(value) => handleRowsPerPageChanged(value)}
                  />
                </div>
              </Table.Cell>
            </Table.Row>
          </tfoot>
        )}
      </Table>
    </>
  );

  const renderTable = () => (
    <div className={classes.tableContainer}>
      <Table
        id='instance-selection-table'
        className={classes.table}
      >
        <Table.Head id='instance-selection-table-header'>
          <Table.Row>
            <Table.HeaderCell>
              <Lang id='instance_selection.last_changed' />
            </Table.HeaderCell>
            <Table.HeaderCell>
              <Lang id='instance_selection.changed_by' />
            </Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Head>
        <Table.Body id='instance-selection-table-body'>
          {paginatedInstances.map((instance: ISimpleInstance) => (
            <Table.Row key={instance.id}>
              <Table.Cell>{getDateDisplayString(instance.lastChanged)}</Table.Cell>
              <Table.Cell>{instance.lastChangedBy}</Table.Cell>
              <Table.Cell className={classes.buttonCell}>
                <div className={classes.tableButtonWrapper}>
                  <Button
                    variant='tertiary'
                    color='second'
                    onClick={(ev) => openInstance(instance.id, ev, navigate, setNavigationEffect)}
                  >
                    <Lang id='instance_selection.continue' />
                    <PencilIcon
                      fontSize='1rem'
                      title={langAsString('instance_selection.continue')}
                    />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        {instances.length > rowsPerPageOptions[0] && (
          <tfoot>
            <Table.Row>
              <Table.Cell colSpan={3}>
                <div className={classes.paginationWrapper}>
                  <Pagination
                    id='instance-selection'
                    nextLabel={langAsString('list_component.nextPage')}
                    nextLabelAriaLabel={langAsString('list_component.nextPageAriaLabel')}
                    previousLabel={langAsString('list_component.previousPage')}
                    previousLabelAriaLabel={langAsString('list_component.previousPageAriaLabel')}
                    rowsPerPageText={langAsString('list_component.rowsPerPage')}
                    size='sm'
                    hideLabels={false}
                    currentPage={currentPage}
                    numberOfRows={instances.length}
                    showRowsPerPageDropdown={true}
                    pageSize={rowsPerPage}
                    rowsPerPageOptions={rowsPerPageOptions}
                    onPageSizeChange={(value) => handleRowsPerPageChanged(+value)}
                    setCurrentPage={setCurrentPage}
                  />
                </div>
              </Table.Cell>
            </Table.Row>
          </tfoot>
        )}
      </Table>
    </div>
  );

  return (
    <>
      <title>{`${getPageTitle(appName, langAsString('instance_selection.left_of'), appOwner)}`}</title>
      <div id='instance-selection-container'>
        <div>
          <Heading
            level={2}
            data-size='md'
            id='instance-selection-header'
          >
            <Lang id='instance_selection.header' />
          </Heading>
        </div>
        <div id='instance-selection-description'>
          <Paragraph className={classes.descriptionParagraph}>
            <Lang id='instance_selection.description' />
          </Paragraph>
        </div>

        {mobileView && renderMobileTable()}
        {!mobileView && renderTable()}
        <div className={classes.startNewButtonContainer}>
          <ErrorReport
            show={instantiation.error !== undefined}
            errors={instantiation.error ? <ErrorListFromInstantiation error={instantiation.error} /> : undefined}
          >
            <Button
              disabled={isAnyProcessing}
              isLoading={isLoading}
              size='md'
              onClick={() =>
                performProcess(async () => {
                  if (selectedParty) {
                    await instantiation.instantiate(selectedParty.partyId, {
                      force: true,
                      onSuccess: (data) =>
                        setNavigationEffect({
                          targetLocation: `/instance/${data.id}`,
                          matchStart: true,
                          callback: focusMainContent,
                        }),
                    });
                  }
                })
              }
              id='new-instance-button'
            >
              <Lang id='instance_selection.new_instance' />
            </Button>
          </ErrorReport>
        </div>
      </div>
      <ReadyForPrint type='load' />
    </>
  );
}

/**
 * Opens a new tab with the given url
 * This works much like window.open, but respects the browser settings for opening
 * new tabs (if they should open in the background or not)
 */
const openInTab = (url: string, originalEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
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
  const newEvent = new MouseEvent(originalEvent.type, options);
  link.dispatchEvent(newEvent);
};

/**
 * Opens the instance in a new tab if the user holds down ctrl or meta (cmd) while clicking, otherwise
 * behaves like a normal link.
 */
const openInstance = (
  instanceId: string,
  originalEvent: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  navigate: ReturnType<typeof useNavigate>,
  setNavigationEffect: ReturnType<typeof useSetNavigationEffect>,
) => {
  if (originalEvent.ctrlKey || originalEvent.metaKey || originalEvent.button === 1) {
    originalEvent.stopPropagation();
    originalEvent.preventDefault();
    openInTab(getInstanceUiUrl(instanceId), originalEvent);
    return;
  }

  if (originalEvent.type !== 'click') {
    return;
  }

  setNavigationEffect({
    targetLocation: `/instance/${instanceId}`,
    matchStart: true,
    callback: focusMainContent,
  });
  navigate(`/instance/${instanceId}`);
};
