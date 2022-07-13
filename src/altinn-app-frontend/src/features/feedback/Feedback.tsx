import * as React from 'react';
import { Typography, createTheme, MuiThemeProvider } from '@material-ui/core';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { ProcessActions } from 'src/shared/resources/process/processSlice';
import { getTextFromAppOrDefault } from '../../utils/textResource';
import { useAppSelector, useAppDispatch } from 'src/common/hooks';

const theme = createTheme(AltinnAppTheme);

export default function Feedback() {
  const dispatch = useAppDispatch();
  const processState = useAppSelector((state) => state.process.taskType);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const language = useAppSelector((state) => state.language.language);

  React.useEffect(() => {
    if (processState) {
      dispatch(ProcessActions.checkIfUpdated());
    }
  }, [processState, dispatch]);

  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <Typography variant='body1'>
          {getTextFromAppOrDefault('feedback.title', textResources, language)}
        </Typography>
        <Typography variant='body1'>
          {getTextFromAppOrDefault('feedback.body', textResources, language)}
        </Typography>
      </MuiThemeProvider>
    </React.Fragment>
  );
}
