import * as React from 'react';

import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import { Grid, makeStyles } from '@material-ui/core';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { FullWidthWrapper } from 'src/features/form/components/FullWidthWrapper';
import { renderLayoutComponent } from 'src/features/form/containers/Form';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getMappedErrors, getUnmappedErrors } from 'src/utils/validation';
import type { ILayout } from 'src/features/form/layout';
import type { FlatError } from 'src/utils/validation';

import {
  getLanguageFromKey,
  getParsedLanguageFromText,
} from 'altinn-shared/utils';

export interface IErrorReportProps {
  components: ILayout;
}

const iconSize = 16;
const ArrowForwardIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${iconSize}" style="position: relative; top: 2px">
  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
</svg>`;

const useStyles = makeStyles((theme) => ({
  errorList: {
    listStylePosition: 'outside',
    marginLeft: iconSize + theme.spacing(1),
    listStyleImage: `url("data:image/svg+xml,${encodeURIComponent(
      ArrowForwardIcon,
    )}")`,
    '& > li': {
      marginBottom: theme.spacing(1),
    },
    '& > li > button': {
      textAlign: 'left',
      borderBottom: '2px solid transparent',
    },
    '& > li > button:hover': {
      borderBottom: `2px solid black`,
    },
  },
  buttonAsInvisibleLink: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline',
    margin: 0,
    padding: 0,
  },
}));

const ErrorReport = ({ components }: IErrorReportProps) => {
  const classes = useStyles();
  const dispatch = useAppDispatch();
  const currentView = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView,
  );
  const [errorsMapped, errorsUnmapped] = useAppSelector((state) => [
    getMappedErrors(state.formValidations.validations),
    getUnmappedErrors(state.formValidations.validations),
  ]);
  const language = useAppSelector((state) => state.language.language);
  const hasErrors = errorsUnmapped.length > 0 || errorsMapped.length > 0;

  if (!hasErrors) {
    return null;
  }

  const handleErrorClick =
    (error: FlatError) => (ev: React.KeyboardEvent | React.MouseEvent) => {
      if (
        ev.type === 'keydown' &&
        (ev as React.KeyboardEvent).key !== 'Enter'
      ) {
        return;
      }
      ev.preventDefault();
      if (currentView === error.layout) {
        dispatch(
          FormLayoutActions.updateFocus({
            focusComponentId: error.componentId,
          }),
        );
      } else {
        dispatch(
          FormLayoutActions.updateCurrentView({
            newView: error.layout,
            runValidations: null,
            returnToView: currentView,
            focusComponentId: error.componentId,
          }),
        );
      }
    };

  return (
    <Grid
      data-testid='ErrorReport'
      item={true}
      xs={12}
    >
      <FullWidthWrapper isOnBottom={true}>
        <Panel
          title={getLanguageFromKey(
            'form_filler.error_report_header',
            language,
          )}
          showIcon={false}
          variant={PanelVariant.Error}
        >
          <Grid
            container={true}
            item={true}
            spacing={3}
            alignItems='flex-start'
          >
            <Grid
              item
              xs={12}
            >
              <ul className={classes.errorList}>
                {errorsUnmapped.map((error: string, index: number) => (
                  <li key={`unmapped-${index}`}>
                    {getParsedLanguageFromText(error, {
                      disallowedTags: ['a'],
                    })}
                  </li>
                ))}
                {errorsMapped.map((error) => (
                  <li key={`mapped-${error.componentId}`}>
                    <button
                      className={classes.buttonAsInvisibleLink}
                      onClick={handleErrorClick(error)}
                      onKeyDown={handleErrorClick(error)}
                    >
                      {getParsedLanguageFromText(error.message, {
                        disallowedTags: ['a'],
                      })}
                    </button>
                  </li>
                ))}
              </ul>
            </Grid>
            {components.map((component) => {
              return renderLayoutComponent(component, []);
            })}
          </Grid>
        </Panel>
      </FullWidthWrapper>
    </Grid>
  );
};

export default ErrorReport;
