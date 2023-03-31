import React from 'react';

import { createTheme, MuiThemeProvider, Typography } from '@material-ui/core';

import { ReadyForPrint } from 'src/components/ReadyForPrint';
import { ProcessActions } from 'src/features/process/processSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { getTextFromAppOrDefault } from 'src/utils/textResource';

const theme = createTheme(AltinnAppTheme);

export function Feedback() {
  const dispatch = useAppDispatch();
  const processState = useAppSelector((state) => state.process.taskType);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);

  React.useEffect(() => {
    if (processState) {
      dispatch(ProcessActions.checkIfUpdated());
    }
  }, [processState, dispatch]);

  if (!language) {
    return null;
  }

  return (
    <div id='FeedbackContainer'>
      <MuiThemeProvider theme={theme}>
        <Typography variant='body1'>{getTextFromAppOrDefault('feedback.title', textResources, language)}</Typography>
        <Typography variant='body1'>{getTextFromAppOrDefault('feedback.body', textResources, language)}</Typography>
      </MuiThemeProvider>
      <ReadyForPrint />
    </div>
  );
}
