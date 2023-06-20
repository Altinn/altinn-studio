import React from 'react';

import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';

import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import classes from 'src/components/message/ErrorReport.module.css';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { getMappedErrors, getUnmappedErrors } from 'src/utils/validation/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { FlatError } from 'src/utils/validation/validation';

export interface IErrorReportProps {
  nodes: LayoutNode[];
}

const ArrowForwardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" style="position: relative; top: 2px">
<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
</svg>`;
const listStyleImg = `url("data:image/svg+xml,${encodeURIComponent(ArrowForwardSvg)}")`;

export const ErrorReport = ({ nodes }: IErrorReportProps) => {
  const dispatch = useAppDispatch();
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const [errorsMapped, errorsUnmapped] = useAppSelector((state) => [
    getMappedErrors(state.formValidations.validations),
    getUnmappedErrors(state.formValidations.validations),
  ]);
  const allNodes = useExprContext();
  const hasErrors = errorsUnmapped.length > 0 || errorsMapped.length > 0;
  const { lang } = useLanguage();

  if (!hasErrors) {
    return null;
  }

  const handleErrorClick = (error: FlatError) => (ev: React.KeyboardEvent | React.MouseEvent) => {
    if (ev.type === 'keydown' && (ev as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    if (currentView !== error.layout) {
      dispatch(
        FormLayoutActions.updateCurrentView({
          newView: error.layout,
        }),
      );
    }

    const componentNode = allNodes?.findById(error.componentId);

    // Iterate over parent repeating groups
    componentNode?.parents().forEach((parentNode, i, allParents) => {
      const parent = parentNode.item;
      if (parent?.type == 'Group' && parent.edit?.mode !== 'likert' && parent.maxCount && parent.maxCount > 1) {
        const childNode = i == 0 ? componentNode : (allParents[i - 1] as LayoutNode);

        // Go to correct multiPage page if necessary
        if (parent.edit?.multiPage && childNode.item.multiPageIndex !== undefined) {
          const multiPageIndex = childNode.item.multiPageIndex;
          dispatch(
            FormLayoutActions.repGroupSetMultiPage({
              groupId: parent.id,
              page: multiPageIndex,
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

  const errorMessage = (message: string) =>
    message.includes(AsciiUnitSeparator) ? message.substring(message.indexOf(AsciiUnitSeparator) + 1) : message;

  return (
    <div data-testid='ErrorReport'>
      <FullWidthWrapper isOnBottom={true}>
        <Panel
          title={lang('form_filler.error_report_header')}
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
                {errorsUnmapped.map((error: string) => (
                  <li
                    key={`unmapped-${error}`}
                    style={{ listStyleImage: listStyleImg }}
                  >
                    {getParsedLanguageFromText(error, {
                      disallowedTags: ['a'],
                    })}
                  </li>
                ))}
                {errorsMapped.map((error) => (
                  <li
                    key={`mapped-${error.componentId}-${error.message}`}
                    style={{ listStyleImage: listStyleImg }}
                  >
                    <button
                      className={classes.buttonAsInvisibleLink}
                      onClick={handleErrorClick(error)}
                      onKeyDown={handleErrorClick(error)}
                    >
                      {getParsedLanguageFromText(errorMessage(error.message), {
                        disallowedTags: ['a'],
                      })}
                    </button>
                  </li>
                ))}
              </ul>
            </Grid>
            {nodes.map((n) => (
              <GenericComponent
                key={n.item.id}
                node={n}
              />
            ))}
          </Grid>
        </Panel>
      </FullWidthWrapper>
    </div>
  );
};
