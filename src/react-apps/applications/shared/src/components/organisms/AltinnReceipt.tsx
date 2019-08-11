import { Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, MuiThemeProvider, WithStyles, withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import classNames from 'classnames';
import * as React from 'react';
import altinnTheme from '../../theme/altinnAppTheme';

// import { getLanguageFromKey } from '../../utils/language';

export interface IReceiptComponentProps extends WithStyles<typeof styles> {
  attachments: any;
  instanceMetaDataObject: any;
  language: any;
  appName: any;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
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

export function ReceiptComponent(props: IReceiptComponentProps) {

  const returnInstanceMetaDataGridRow = (name: string, prop: string, classes: any, index: number, language: any) => {
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

  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <Typography variant='h2'>
          {props.appName} er sendt inn
        </Typography>
        <Table style={{ height: 'auto', width: 'auto' }} padding='none' className={props.classes.instanceMetaData}>
          <TableBody>
            {Object.keys(props.instanceMetaDataObject).map((name, i) => (
              returnInstanceMetaDataGridRow(name, props.instanceMetaDataObject[name], props.classes, i, props.language)
            ))}
          </TableBody>
        </Table>
        <Typography variant='body1' className={props.classes.paddingTop24}>
          Kopi av din kvittering er sendt til <a href=''>din innboks</a>
        </Typography>
        <Typography variant='body1' className={props.classes.paddingTop24}>
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
}

export default withStyles(styles)(ReceiptComponent);
