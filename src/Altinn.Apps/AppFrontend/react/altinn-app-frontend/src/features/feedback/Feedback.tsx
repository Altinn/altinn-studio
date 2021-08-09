import * as React from 'react';
import { Typography, createTheme, MuiThemeProvider } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';
import ProcessDispatcher from '../../shared/resources/process/processDispatcher';
import { getTextFromAppOrDefault } from '../../utils/textResource';

const theme = createTheme(AltinnAppTheme);

export default function Feedback() {
  const processState = useSelector((state: IRuntimeState) => state.process.taskType);
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
        <Typography variant='body1'>
          {getTextFromAppOrDefault('feedback.title', textResouces, language)}
        </Typography>
        <Typography variant='body1'>
          {getTextFromAppOrDefault('feedback.body', textResouces, language)}
        </Typography>
      </MuiThemeProvider>
    </React.Fragment>
  );
}
