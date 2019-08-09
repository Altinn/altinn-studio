import * as React from 'react';
import { connect } from 'react-redux';
// import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import { IRuntimeState } from '../../../types';

import { Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, MuiThemeProvider, withStyles } from '@material-ui/core/styles';
import altinnTheme from '../../../../../shared/src/theme/altinnAppTheme';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';

import classNames from 'classnames';

export interface IReceiptComponentProvidedProps {
  classes: any;
}

export interface IReceiptComponentProps extends IReceiptComponentProvidedProps {
  attachments: any;
  formConfig: any;
  language: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  instanceMetaData: {
    marginTop: 36,
  },
  tableCell: {
    borderBottom: 0,
    paddingRight: '2.5rem',
  },
  tableRow: {
    height: 'auto',
  },
  paddingTop24: {
    paddingTop: '2.4rem',
  },
});

const instanceMetaDataFields = [
  // dato sendt, avsender, mottaker, referansenummer
  'serviceName', 'serviceName', 'serviceName', 'serviceName',
];

const returnInstanceMetaDataGridRow = (name: string, prop: string, classes: any, index: number) => {
  return (
    <TableRow
      key={index}
      classes={{
        root: classNames(classes.tableRow),
      }}
    >
      <TableCell
        padding='none'
        classes={{
          root: classNames(classes.tableCell),
        }}
      >
        <Typography variant='body1'>
          {name}:
        </Typography>
      </TableCell>
      <TableCell
        padding='none'
        classes={{
          root: classNames(classes.tableCell),
        }}
      >
        <Typography variant='body1'>
          {prop}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

const ReceiptComponent = (props: IReceiptComponentProps) => {
  const { classes } = props;
  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <Typography variant='h2'>
          {props.formConfig.serviceName} er sendt inn
        </Typography>
        <Table style={{ height: 'auto', width: 'auto' }} padding='none' className={classes.instanceMetaData}>
          <TableBody>
            {instanceMetaDataFields.map((field, index) => (
              returnInstanceMetaDataGridRow(field, props.formConfig[field], classes, index)
            ))
            }
          </TableBody>
        </Table>
        <Typography variant='body1' className={classes.paddingTop24}>
          Kopi av din kvittering er sendt til <a href=''>din innboks</a>
        </Typography>
        <Typography variant='body1' className={classes.paddingTop24}>
          Det er gjennomført en maskinell kontroll under utfylling, men vi tar forbehold om at det kan bli
          oppdaget feil under saksbehandlingen og at annen dokumentasjon kan være nødvendig. Vennligst oppgi
          referansenummer ved eventuelle henvendelser til etaten.
        </Typography>
        <Typography variant='h3' style={{ paddingTop: '4.1rem' }}>
          Følgende er sendt:
        </Typography>
      </MuiThemeProvider>
    </React.Fragment>
  );
};

const mapStateToProps: (
  state: IRuntimeState,
  props: IReceiptComponentProvidedProps,
) => IReceiptComponentProps = (state: IRuntimeState, props: IReceiptComponentProvidedProps) => ({
  attachments: state.attachments,
  classes: props.classes,
  formConfig: state.formConfig,
  language: state.language,
});

export default withStyles(styles)(connect(mapStateToProps)(ReceiptComponent));
