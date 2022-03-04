import * as React from 'react';
import { Typography, createTheme, MuiThemeProvider } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';
import ProcessDispatcher from '../../shared/resources/process/processDispatcher';
import { getTextFromAppOrDefault } from '../../utils/textResource';
import { useAppSelector } from 'src/common/hooks';

const theme = createTheme(AltinnAppTheme);

export default function Feedback() {
  const processState = useAppSelector(state => state.process.taskType);
  const textResouces = useAppSelector(state => state.textResources.resources);
  const language = useAppSelector(state => state.language.language);

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
