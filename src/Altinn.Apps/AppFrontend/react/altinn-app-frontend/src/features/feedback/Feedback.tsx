import * as React from 'react';
import { Typography, createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import {AltinnAppTheme} from 'altinn-shared/theme'
import ProcessDispatcher from '../../shared/resources/process/processDispatcher';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';

const theme = createMuiTheme(AltinnAppTheme);

export default function Feedback() {

  const processState = useSelector((state: IRuntimeState) => state.process.state);

  React.useEffect(() => {
    if (processState) {
      ProcessDispatcher.checkProcessUpdated();
    }
  }, [processState]);

  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <Typography variant={'h2'}>
          Du blir snart videresendt
        </Typography>
        <Typography variant={'body1'}>
          Vi venter på verifikasjon fra Skatteetaten, når den er på plass blir du videresendt til kvitteringen.
        </Typography>
      </MuiThemeProvider>
    </React.Fragment>
  )
}