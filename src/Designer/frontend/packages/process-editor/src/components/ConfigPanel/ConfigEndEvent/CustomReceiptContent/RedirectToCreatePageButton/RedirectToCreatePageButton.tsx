import React from 'react';
import classes from './RedirectToCreatePageButton.module.css';
import { PencilWritingIcon } from '@studio/icons';
import { StudioButton, StudioRedirectBox } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import getLayoutSetPath from '@altinn/ux-editor/utils/routeUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Link } from 'react-router-dom';

export const RedirectToCreatePageButton = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { existingCustomReceiptLayoutSetId } = useBpmnApiContext();

  return (
    <div className={classes.goToCreatePageWrapper}>
      <StudioRedirectBox
        title={t('process_editor.configuration_panel_custom_receipt_navigate_to_design_title')}
      >
        <StudioButton variant='tertiary' icon={<PencilWritingIcon />}>
          <Link to={getLayoutSetPath(org, app, existingCustomReceiptLayoutSetId)}>
            {t('process_editor.configuration_panel_custom_receipt_navigate_to_design_link')}
          </Link>
        </StudioButton>
      </StudioRedirectBox>
    </div>
  );
};
