import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { Grid, TableCell, Typography, useMediaQuery } from '@material-ui/core';
import { Edit as EditIcon } from '@navikt/ds-icons';

import { useAppSelector } from 'src/common/hooks';
import {
  AltinnButton,
  AltinnMobileTable,
  AltinnMobileTableItem,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'src/components/shared';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
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

export default function InstanceSelection({ instances, onNewInstance }: IInstanceSelectionProps) {
  const language = useAppSelector((state) => state.language.language);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal

  const openInstance = (instanceId: string) => {
    window.location.href = getInstanceUiUrl(instanceId);
  };

  if (!language) {
    return null;
  }

  const renderMobileTable = () => {
    return (
      <>
        <Typography variant='h3'>{getLanguageFromKey('instance_selection.left_of', language)}</Typography>
        <AltinnMobileTable id='instance-selection-mobile-table'>
          {instances.map((instance) => {
            return (
              <AltinnMobileTableItem
                items={[
                  {
                    key: 1,
                    label: getLanguageFromKey('instance_selection.last_changed', language),
                    value: getDateDisplayString(instance.lastChanged),
                  },
                  {
                    key: 2,
                    label: getLanguageFromKey('instance_selection.changed_by', language),
                    value: instance.lastChangedBy,
                  },
                ]}
                tableItemIndex={-2}
                editIndex={-2}
                onEditClick={() => openInstance(instance.id)}
                key={instance.id}
                editButtonText={getLanguageFromKey('instance_selection.continue', language)}
              />
            );
          })}
        </AltinnMobileTable>
      </>
    );
  };

  const renderTable = () => {
    return (
      <AltinnTable id='instance-selection-table'>
        <AltinnTableHeader id='instance-selection-table-header'>
          <AltinnTableRow>
            <TableCell>{getLanguageFromKey('instance_selection.last_changed', language)}</TableCell>
            <TableCell>{getLanguageFromKey('instance_selection.changed_by', language)}</TableCell>
          </AltinnTableRow>
        </AltinnTableHeader>
        <AltinnTableBody id='instance-selection-table-body'>
          {instances.map((instance: ISimpleInstance) => {
            return (
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
                      {getLanguageFromKey('instance_selection.continue', language)}
                    </Button>
                  </div>
                </TableCell>
              </AltinnTableRow>
            );
          })}
        </AltinnTableBody>
      </AltinnTable>
    );
  };

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
            {getLanguageFromKey('instance_selection.header', language)}
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
            {getLanguageFromKey('instance_selection.description', language)}
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
          <AltinnButton
            btnText={getLanguageFromKey('instance_selection.new_instance', language)}
            onClickFunction={onNewInstance}
            id='new-instance-button'
          />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}
