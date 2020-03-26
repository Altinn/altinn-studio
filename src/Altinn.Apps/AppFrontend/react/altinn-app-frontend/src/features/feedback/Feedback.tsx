import * as React from 'react';
import { Typography, createMuiTheme, MuiThemeProvider, makeStyles } from '@material-ui/core';
import {AltinnAppTheme} from 'altinn-shared/theme'
import ProcessDispatcher from '../../shared/resources/process/processDispatcher';
import { getTextFromAppOrDefault } from '../../utils/textResource';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';

const theme = createMuiTheme(AltinnAppTheme);

const useStyle = makeStyles({
  h2: {
    'padding-bottom': 12,
  }
});

export default function Feedback() {

  const classes = useStyle();
  const processState = useSelector((state: IRuntimeState) => state.process.state);
  const textResouces = useSelector((state: IRuntimeState) => state.textResources.resources);
  const language = useSelector((state: IRuntimeState) => state.language.language);

  React.useEffect(() => {
    if (processState) {
      ProcessDispatcher.checkProcessUpdated();
    }
  }, [processState]);

  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <Typography variant={'h2'} className={classes.h2}>
          {getTextFromAppOrDefault('feedback.title', textResouces, language)}
        </Typography>
        <Typography variant={'body1'}>
          {getTextFromAppOrDefault('feedback.body', textResouces, language)}
        </Typography>
      </MuiThemeProvider>
    </React.Fragment>
  )
}