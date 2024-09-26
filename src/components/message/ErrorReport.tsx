import React from 'react';

import { Panel, PanelVariant } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';

import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import classes from 'src/components/message/ErrorReport.module.css';
import { useNavigateToNode } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useTaskErrors } from 'src/features/validation/selectors/taskErrors';
import { GenericComponentById } from 'src/layout/GenericComponent';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useGetUniqueKeyFromObject } from 'src/utils/useGetKeyFromObject';
import type { NodeRefValidation } from 'src/features/validation';

export interface IErrorReportProps {
  renderIds: string[];
}

const ArrowForwardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" style="position: relative; top: 2px">
<path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
</svg>`;
const listStyleImg = `url("data:image/svg+xml,${encodeURIComponent(ArrowForwardSvg)}")`;

export const ErrorReport = ({ renderIds }: IErrorReportProps) => {
  const { formErrors, taskErrors } = useTaskErrors();
  const hasErrors = Boolean(formErrors.length) || Boolean(taskErrors.length);
  const getUniqueKeyFromObject = useGetUniqueKeyFromObject();

  if (!hasErrors) {
    return null;
  }

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
            spacing={6}
            alignItems='flex-start'
          >
            <Grid
              item
              xs={12}
            >
              <ul className={classes.errorList}>
                {taskErrors.map((error) => (
                  <li
                    key={getUniqueKeyFromObject(error)}
                    style={{ listStyleImage: listStyleImg }}
                  >
                    <Lang
                      id={error.message.key}
                      params={error.message.params}
                    />
                  </li>
                ))}
                {formErrors.map((error) => (
                  <Error
                    key={getUniqueKeyFromObject(error)}
                    error={error}
                  />
                ))}
              </ul>
            </Grid>
            {renderIds.map((id) => (
              <GenericComponentById
                key={id}
                id={id}
              />
            ))}
          </Grid>
        </Panel>
      </FullWidthWrapper>
    </div>
  );
};

function Error({ error }: { error: NodeRefValidation }) {
  const node = useNode(error.nodeId);
  const navigateTo = useNavigateToNode();
  const isHidden = Hidden.useIsHidden(node);

  const handleErrorClick = async (ev: React.KeyboardEvent | React.MouseEvent) => {
    if (ev.type === 'keydown' && (ev as React.KeyboardEvent).key !== 'Enter') {
      return;
    }
    ev.preventDefault();
    if (isHidden) {
      // No point in trying to focus on a hidden component
      return;
    }

    await navigateTo(node, { shouldFocus: true, error });
  };

  return (
    <li style={{ listStyleImage: listStyleImg }}>
      <button
        className={classes.buttonAsInvisibleLink}
        onClick={handleErrorClick}
        onKeyDown={handleErrorClick}
      >
        <Lang
          id={error.message.key}
          params={error.message.params}
          node={node}
        />
      </button>
    </li>
  );
}
