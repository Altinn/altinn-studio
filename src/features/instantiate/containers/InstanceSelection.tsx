import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Grid, TableCell, Typography } from '@material-ui/core';
import { Edit as EditIcon } from '@navikt/ds-icons';

import { AltinnTable } from 'src/components/organisms/AltinnTable';
import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { AltinnMobileTable } from 'src/components/table/AltinnMobileTable';
import { AltinnMobileTableItem } from 'src/components/table/AltinnMobileTableItem';
import { AltinnTableBody } from 'src/components/table/AltinnTableBody';
import { AltinnTableHeader } from 'src/components/table/AltinnTableHeader';
import { AltinnTableRow } from 'src/components/table/AltinnTableRow';
import { useIsMobileOrTablet } from 'src/hooks/useIsMobile';
import { useLanguage } from 'src/hooks/useLanguage';
import { getInstanceUiUrl } from 'src/utils/urls/appUrlHelper';
import type { ISimpleInstance } from 'src/types';

export interface IInstanceSelectionProps {
  instances: ISimpleInstance[];
  onNewInstance: () => void;
}

function getDateDisplayString(timeStamp: string) {
  let date = new Date(timeStamp);
  const offset = date.getTimezoneOffset();
  date = new Date(date.getTime() - offset * 60 * 1000);
  const locale = window.navigator?.language || (window.navigator as any)?.userLanguage || 'nb-NO';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const marginTop12 = {
  marginTop: '12px',
};

const marginTop26 = {
  marginTop: '26px',
};

const tableButtonWrapper = {
  display: 'flex',
  justifyContent: 'right',
};

const buttonCell = {
  padding: '4px 36px 4px 4px',
};

export function InstanceSelection({ instances, onNewInstance }: IInstanceSelectionProps) {
  const { lang, langAsString } = useLanguage();
  const mobileView = useIsMobileOrTablet();

  const openInstance = (instanceId: string) => {
    window.location.href = getInstanceUiUrl(instanceId);
  };

  const renderMobileTable = () => (
    <>
      <Typography variant='h3'>{lang('instance_selection.left_of')}</Typography>
      <AltinnMobileTable id='instance-selection-mobile-table'>
        {instances.map((instance) => (
          <AltinnMobileTableItem
            items={[
              {
                key: 1,
                label: langAsString('instance_selection.last_changed'),
                value: getDateDisplayString(instance.lastChanged),
              },
              {
                key: 2,
                label: langAsString('instance_selection.changed_by'),
                value: instance.lastChangedBy,
              },
            ]}
            tableItemIndex={-2}
            editIndex={-2}
            onEditClick={() => openInstance(instance.id)}
            key={instance.id}
            editButtonText={langAsString('instance_selection.continue')}
          />
        ))}
      </AltinnMobileTable>
    </>
  );

  const renderTable = () => (
    <AltinnTable id='instance-selection-table'>
      <AltinnTableHeader id='instance-selection-table-header'>
        <AltinnTableRow>
          <TableCell>{lang('instance_selection.last_changed')}</TableCell>
          <TableCell>{lang('instance_selection.changed_by')}</TableCell>
        </AltinnTableRow>
      </AltinnTableHeader>
      <AltinnTableBody id='instance-selection-table-body'>
        {instances.map((instance: ISimpleInstance) => (
          <AltinnTableRow key={instance.id}>
            <TableCell>{getDateDisplayString(instance.lastChanged)}</TableCell>
            <TableCell>{instance.lastChangedBy}</TableCell>
            <TableCell style={buttonCell}>
              <div style={tableButtonWrapper}>
                <Button
                  variant={ButtonVariant.Quiet}
                  color={ButtonColor.Secondary}
                  icon={<EditIcon />}
                  iconPlacement='right'
                  onClick={() => openInstance(instance.id)}
                >
                  {lang('instance_selection.continue')}
                </Button>
              </div>
            </TableCell>
          </AltinnTableRow>
        ))}
      </AltinnTableBody>
    </AltinnTable>
  );

  return (
    <>
      <Grid
        container
        id='instance-selection-container'
      >
        <Grid item>
          <Typography
            variant='h2'
            id='instance-selection-header'
          >
            {lang('instance_selection.header')}
          </Typography>
        </Grid>
        <Grid
          item
          id='instance-selection-description'
        >
          <Typography
            variant='body1'
            style={marginTop12}
          >
            {lang('instance_selection.description')}
          </Typography>
        </Grid>
        <Grid
          item
          style={marginTop26}
        >
          {mobileView && renderMobileTable()}
          {!mobileView && renderTable()}
        </Grid>
        <Grid
          item
          style={marginTop12}
        >
          <Button
            onClick={onNewInstance}
            id='new-instance-button'
          >
            {lang('instance_selection.new_instance')}
          </Button>
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}
