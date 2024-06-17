import React from 'react';
import classes from './RedirectToCreatePageButton.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { PencilWritingIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';
import { useLocalStorage } from 'app-shared/hooks/useLocalStorage';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { RedirectBox } from '../../../../RedirectBox';

export const RedirectToCreatePageButton = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const packagesRouter = new PackagesRouter({ org, app });
  const { existingCustomReceiptLayoutSetId } = useBpmnApiContext();

  const [, setSelectedLayoutSet] = useLocalStorage<string>('layoutSet/' + app, null);

  const handleClick = () => {
    setSelectedLayoutSet(existingCustomReceiptLayoutSetId);
  };

  return (
    <div className={classes.goToCreatePageWrapper}>
      <RedirectBox
        title={t('process_editor.configuration_panel_custom_receipt_navigate_to_lage_title')}
      >
        <StudioButton
          as='a'
          size='small'
          variant='primary'
          color='second'
          icon={<PencilWritingIcon />}
          href={packagesRouter.getPackageNavigationUrl('editorUiEditor')}
          onClick={handleClick}
        >
          {t('process_editor.configuration_panel_custom_receipt_navigate_to_lage_button')}
        </StudioButton>
      </RedirectBox>
    </div>
  );
};
