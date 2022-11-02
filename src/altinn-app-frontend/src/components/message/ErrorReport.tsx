import * as React from 'react';

import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import { Grid, makeStyles } from '@material-ui/core';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { FullWidthWrapper } from 'src/features/form/components/FullWidthWrapper';
import { renderLayoutComponent } from 'src/features/form/containers/Form';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { nodesInLayout } from 'src/utils/layout/hierarchy';
import { getMappedErrors, getUnmappedErrors } from 'src/utils/validation';
import type { ILayout } from 'src/features/form/layout';
import type { AnyChildNode } from 'src/utils/layout/hierarchy.types';
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
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const repeatingGroups = useAppSelector(
    (state) => state.formLayout.uiConfig.repeatingGroups,
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
      if (currentView !== error.layout) {
        dispatch(
          FormLayoutActions.updateCurrentView({
            newView: error.layout,
            returnToView: currentView,
          }),
        );
      }

      const nodes = nodesInLayout(
        layouts && layouts[error.layout],
        repeatingGroups,
      );
      const componentNode = nodes.findById(error.componentId);

      // Iterate over parent repeating groups
      componentNode?.parents().forEach((parentNode, i, allParents) => {
        const parent = parentNode.item;
        if (
          parent?.type == 'Group' &&
          parent.edit?.mode !== 'likert' &&
          parent.maxCount &&
          parent.maxCount > 1
        ) {
          const childNode =
            i == 0
              ? componentNode
              : (allParents[i - 1] as AnyChildNode<'unresolved'>);

          // Go to correct multiPage page if necessary
          if (parent.edit?.multiPage && 'multiPageIndex' in childNode.item) {
            const multiPageIndex = childNode.item.multiPageIndex;
            dispatch(
              FormLayoutActions.updateRepeatingGroupsMultiPageIndex({
                group: parent.id,
                index: multiPageIndex,
              }),
            );
          }

          if (childNode?.rowIndex !== undefined) {
            // Set editIndex to rowIndex
            dispatch(
              FormLayoutActions.updateRepeatingGroupsEditIndex({
                group: parent.id,
                index: childNode.rowIndex,
              }),
            );
          }
        }
      });

      // Set focus
      dispatch(
        FormLayoutActions.updateFocus({
          focusComponentId: error.componentId,
        }),
      );
    };

  return (
    <Grid
      data-testid='ErrorReport'
      item={true}
      xs={12}
    >
      <FullWidthWrapper isOnBottom={true}>
        <Panel
          title={
            language &&
            getLanguageFromKey('form_filler.error_report_header', language)
          }
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
