import React from 'react';
import classes from './RedirectToCreatePageButton.module.css';
import { PencilWritingIcon } from '@studio/icons';
import { StudioRedirectBox } from '@studio/components-legacy';
import { StudioLink } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import getLayoutSetPath from '@altinn/ux-editor/utils/routeUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useNavigate } from 'react-router-dom';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export const RedirectToCreatePageButton = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { existingCustomReceiptLayoutSetId } = useBpmnApiContext();
  const navigate = useNavigate();
  const packagesRouter = new PackagesRouter({ org, app });

  const navigateToLayoutSet = () => {
    navigate(getLayoutSetPath(org, app, existingCustomReceiptLayoutSetId));
  };

  return (
    <div className={classes.goToCreatePageWrapper}>
      <StudioRedirectBox
        title={t('process_editor.configuration_panel_custom_receipt_navigate_to_design_title')}
      >
        <StudioLink
          icon={<PencilWritingIcon />}
          href={packagesRouter.getPackageNavigationUrl('editorUiEditor')}
          className={classes.link}
          color='second'
          onClick={navigateToLayoutSet}
        >
          {t('process_editor.configuration_panel_custom_receipt_navigate_to_design_link')}
        </StudioLink>
      </StudioRedirectBox>
    </div>
  );
};
