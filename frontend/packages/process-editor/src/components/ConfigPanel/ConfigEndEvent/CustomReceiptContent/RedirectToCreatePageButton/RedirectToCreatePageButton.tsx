import React from 'react';
import classes from './RedirectToCreatePageButton.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { PencilWritingIcon } from '@studio/icons';
import { StudioRedirectBox } from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
import { useLocalStorage } from '@studio/components-legacy/src/hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useNavigate } from 'react-router-dom';

export const RedirectToCreatePageButton = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const packagesRouter = new PackagesRouter({ org, app });
  const { existingCustomReceiptLayoutSetId } = useBpmnApiContext();
  const navigate = useNavigate();

  const [, setSelectedLayoutSet] = useLocalStorage<string>('layoutSet/' + app);

  const handleClick = () => {
    setSelectedLayoutSet(existingCustomReceiptLayoutSetId);
    navigate(packagesRouter.getPackageNavigationUrl('editorUiEditor'));
  };

  return (
    <div className={classes.goToCreatePageWrapper}>
      <StudioRedirectBox
        title={t('process_editor.configuration_panel_custom_receipt_navigate_to_design_title')}
      >
        <StudioButton
          className={classes.link}
          icon={<PencilWritingIcon />}
          onClick={handleClick}
          variant='primary'
        >
          {t('process_editor.configuration_panel_custom_receipt_navigate_to_design_button')}
        </StudioButton>
      </StudioRedirectBox>
    </div>
  );
};
