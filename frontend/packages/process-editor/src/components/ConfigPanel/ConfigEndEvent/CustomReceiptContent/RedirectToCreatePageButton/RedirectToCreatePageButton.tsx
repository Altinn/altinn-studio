import React from 'react';
import classes from './RedirectToCreatePageButton.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { PencilWritingIcon } from '@studio/icons';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const RedirectToCreatePageButton = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const packagesRouter = new PackagesRouter({ org, app });

  return (
    <div className={classes.goToCreatePageWrapper}>
      <StudioLabelAsParagraph size='small'>
        {t('process_editor.configuration_panel_custom_receipt_navigate_to_lage_title')}
      </StudioLabelAsParagraph>
      <StudioButton
        as='a'
        size='small'
        variant='primary'
        color='second'
        icon={<PencilWritingIcon />}
        href={packagesRouter.getPackageNavigationUrl('editorUiEditor')}
        className={classes.goToCreateButton}
      >
        {t('process_editor.configuration_panel_custom_receipt_navigate_to_lage_button')}
      </StudioButton>
    </div>
  );
};
