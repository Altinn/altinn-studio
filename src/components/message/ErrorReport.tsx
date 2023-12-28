import React from 'react';

import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';
import { createSelector } from 'reselect';

import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import classes from 'src/components/message/ErrorReport.module.css';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { AsciiUnitSeparator } from 'src/layout/FileUpload/utils/asciiUnitSeparator';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNodes } from 'src/utils/layout/NodesContext';
import { getMappedErrors, getUnmappedErrors } from 'src/utils/validation/validation';
import type { IRuntimeState } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { IValidations } from 'src/utils/validation/types';
import type { FlatError } from 'src/utils/validation/validation';

export interface IErrorReportProps {
  nodes: LayoutNode[];
}

const ArrowForwardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" style="position: relative; top: 2px">
<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
</svg>`;
const listStyleImg = `url("data:image/svg+xml,${encodeURIComponent(ArrowForwardSvg)}")`;

const selectValidations = (state: IRuntimeState) => state.formValidations.validations;
const createMappedAndUnmappedErrors = (validations: IValidations): [FlatError[], string[]] => [
  getMappedErrors(validations),
  getUnmappedErrors(validations),
];
const selectMappedUnmappedErrors = createSelector(selectValidations, createMappedAndUnmappedErrors);

export const ErrorReport = ({ nodes }: IErrorReportProps) => {
  const [errorsMapped, errorsUnmapped] = useAppSelector(selectMappedUnmappedErrors);
  const allNodes = useNodes();
  const hasErrors = errorsUnmapped.length > 0 || errorsMapped.length > 0;
  const navigateTo = useNavigateToNode();

  if (!hasErrors) {
    return null;
  }

  const handleErrorClick = (error: FlatError) => async (ev: React.KeyboardEvent | React.MouseEvent) => {
    if (ev.type === 'keydown' && (ev as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    const componentNode = allNodes?.findById(error.componentId);
    if (!componentNode || componentNode.isHidden()) {
      // No point in trying to focus on a hidden component
      return;
    }

    await navigateTo(componentNode, true);
  };

  const errorMessage = (message: string) =>
    message.includes(AsciiUnitSeparator) ? message.substring(message.indexOf(AsciiUnitSeparator) + 1) : message;

  return (
    <div data-testid='ErrorReport'>
      <FullWidthWrapper isOnBottom={true}>
        <Panel
          title={<Lang id={'form_filler.error_report_header'} />}
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
