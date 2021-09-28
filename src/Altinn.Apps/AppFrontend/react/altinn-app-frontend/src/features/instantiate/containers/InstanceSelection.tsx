import { Grid, IconButton, TableCell, Typography, useMediaQuery } from '@material-ui/core';
import { AltinnButton, AltinnMobileTable, AltinnMobileTableItem, AltinnTable, AltinnTableBody, AltinnTableHeader, AltinnTableRow } from 'altinn-shared/components';
import { getLanguageFromKey } from 'altinn-shared/utils';
import React from 'react';
import { useSelector } from 'react-redux';
import { IRuntimeState, ISimpleInstance } from 'src/types';
import { getInstanceUiUrl } from '../../../utils/urlHelper';

export interface IInstanceSelectionProps {
  instances: ISimpleInstance[];
  onNewInstance: () => void;
}

export default function InstanceSelection({ instances, onNewInstance }: IInstanceSelectionProps) {
  const language = useSelector((state: IRuntimeState) => state.language.language);
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
                  { label: getLanguageFromKey('instance_selection.last_changed', language), value: instance.lastChanged },
                  { label: getLanguageFromKey('instance_selection.changed_by', language), value: instance.lastChangedBy },
                ]}
                onClick={() => openInstance(instance.id)}
                iconNode={
                  <>
                    <Typography variant='body1' style={{ color: '#0062BA', marginRight: '4px', fontWeight: 700 }}>
                      {getLanguageFromKey('instance_selection.continue', language)}
                    </Typography>
                    <i className='fa fa-edit' style={{ color: '#0062BA', fontSize: '24px' }} />
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
            <TableCell>{getLanguageFromKey('instance_selection.last_changed', language)}</TableCell>
            <TableCell>{getLanguageFromKey('instance_selection.changed_by', language)}</TableCell>
          </AltinnTableRow>
        </AltinnTableHeader>
        <AltinnTableBody id='instance-selection-table-body'>
          {instances.map((instance: ISimpleInstance) => {
            return (
              <AltinnTableRow>
                <TableCell>{instance.lastChanged}</TableCell>
                <TableCell>{instance.lastChangedBy}</TableCell>
                <TableCell align='right'>
                  <IconButton onClick={() => openInstance(instance.id)}>
                    <Typography variant='body1' style={{ color: '#0062BA', marginRight: '4px', fontWeight: 700 }}>
                      {getLanguageFromKey('instance_selection.continue', language)}
                    </Typography>
                    <i className='fa fa-edit' style={{ color: '#0062BA', fontSize: '24px' }} />
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
        <Typography variant='body1' style={{ marginTop: '12px' }}>
          {getLanguageFromKey('instance_selection.description', language)}
        </Typography>
      </Grid>
      <Grid item style={{ marginTop: '26px' }}>
        {mobileView && renderMobileTable()}
        {!mobileView && renderTable()}
      </Grid>
      <Grid item style={{ marginTop: '12px' }}>
        <AltinnButton
          btnText={getLanguageFromKey('instance_selection.new_instance', language)}
          onClickFunction={onNewInstance}
          id='new-instance-button'
        />
      </Grid>
    </Grid>
  );
}
