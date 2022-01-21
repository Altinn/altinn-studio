import {
  Grid,
  IconButton,
  TableCell,
  Typography,
  useMediaQuery,
} from '@material-ui/core';
import {
  AltinnButton,
  AltinnMobileTable,
  AltinnMobileTableItem,
  AltinnTable,
  AltinnTableBody,
  AltinnTableHeader,
  AltinnTableRow,
} from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';
import React from 'react';
import { useAppSelector } from 'src/common/hooks';
import { ISimpleInstance } from 'src/types';
import { getInstanceUiUrl } from '../../../utils/urlHelper2';

export interface IInstanceSelectionProps {
  instances: ISimpleInstance[];
  onNewInstance: () => void;
}

function getDateDisplayString(timeStamp: string) {
  let date = new Date(timeStamp);
  const offset = date.getTimezoneOffset();
  date = new Date(date.getTime() - offset * 60 * 1000);
  const locale =
    window.navigator?.language ||
    (window.navigator as any)?.userLanguage ||
    'nb-NO';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

const typographyStyle = {
  color: '#0062BA',
  marginRight: '4px',
  fontWeight: 700,
};

const iconStyle = {
  color: '#0062BA',
  fontSize: '24px',
};

const marginTop12 = {
  marginTop: '12px',
};

const marginTop26 = {
  marginTop: '26px',
};

export default function InstanceSelection({
  instances,
  onNewInstance,
}: IInstanceSelectionProps) {
  const language = useAppSelector(state => state.language.language);
  const mobileView = useMediaQuery('(max-width:992px)'); // breakpoint on altinn-modal

  const openInstance = (instanceId: string) => {
    window.location.href = getInstanceUiUrl(instanceId);
  };

  const renderMobileTable = () => {
    return (
      <>
        <Typography variant='h3'>
          {getLanguageFromKey('instance_selection.left_of', language)}
        </Typography>
        <AltinnMobileTable id='instance-selection-mobile-table'>
          {instances.map((instance) => {
            return (
              <AltinnMobileTableItem
                items={[
                  {
                    key: 1,
                    label: getLanguageFromKey(
                      'instance_selection.last_changed',
                      language,
                    ),
                    value: getDateDisplayString(instance.lastChanged),
                  },
                  {
                    key: 2,
                    label: getLanguageFromKey(
                      'instance_selection.changed_by',
                      language,
                    ),
                    value: instance.lastChangedBy,
                  },
                ]}
                onClick={() => openInstance(instance.id)}
                key={instance.id}
                iconNode={
                  <>
                    <Typography variant='body1' style={typographyStyle}>
                      {getLanguageFromKey(
                        'instance_selection.continue',
                        language,
                      )}
                    </Typography>
                    <i className='fa fa-edit' style={iconStyle} />
                  </>
                }
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
            <TableCell>
              {getLanguageFromKey('instance_selection.last_changed', language)}
            </TableCell>
            <TableCell>
              {getLanguageFromKey('instance_selection.changed_by', language)}
            </TableCell>
          </AltinnTableRow>
        </AltinnTableHeader>
        <AltinnTableBody id='instance-selection-table-body'>
          {instances.map((instance: ISimpleInstance) => {
            return (
              <AltinnTableRow key={instance.id}>
                <TableCell>
                  {getDateDisplayString(instance.lastChanged)}
                </TableCell>
                <TableCell>{instance.lastChangedBy}</TableCell>
                <TableCell align='right'>
                  <IconButton onClick={() => openInstance(instance.id)}>
                    <Typography variant='body1' style={typographyStyle}>
                      {getLanguageFromKey(
                        'instance_selection.continue',
                        language,
                      )}
                    </Typography>
                    <i className='fa fa-edit' style={iconStyle} />
                  </IconButton>
                </TableCell>
              </AltinnTableRow>
            );
          })}
        </AltinnTableBody>
      </AltinnTable>
    );
  };

  return (
    <Grid container id='instance-selection-container'>
      <Grid item>
        <Typography variant='h2' id='instance-selection-header'>
          {getLanguageFromKey('instance_selection.header', language)}
        </Typography>
      </Grid>
      <Grid item id='instance-selection-description'>
        <Typography variant='body1' style={marginTop12}>
          {getLanguageFromKey('instance_selection.description', language)}
        </Typography>
      </Grid>
      <Grid item style={marginTop26}>
        {mobileView && renderMobileTable()}
        {!mobileView && renderTable()}
      </Grid>
      <Grid item style={marginTop12}>
        <AltinnButton
          btnText={getLanguageFromKey(
            'instance_selection.new_instance',
            language,
          )}
          onClickFunction={onNewInstance}
          id='new-instance-button'
        />
      </Grid>
    </Grid>
  );
}
