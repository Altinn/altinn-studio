import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import React from 'react';
import { useAppContext } from '../../hooks';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';

import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './Elements.module.css';

import { StudioButton, StudioSpinner } from '@studio/components';
import { ShrinkIcon } from '@studio/icons';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useTranslation } from 'react-i18next';
import { useProcessTaskTypeQuery } from '../../hooks/queries/useProcessTaskTypeQuery';

export interface ElementsProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Elements = ({ collapsed, onCollapseToggle }: ElementsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();

  const {
    data: processTaskType,
    isPending: isFetchingProcessTaskType,
    isError: hasProcessTaskTypeError,
  } = useProcessTaskTypeQuery(org, app, selectedFormLayoutSetName);

  const existingCustomReceiptName: string | undefined = useCustomReceiptLayoutSetName(org, app);
  const hideComponents =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  if (isFetchingProcessTaskType) {
    return (
      <div className={classes.root}>
        <StudioSpinner
          spinnerTitle={t('schema_editor.loading_available_components')}
          showSpinnerTitle
        />
      </div>
    );
  }

  if (hasProcessTaskTypeError) {
    return (
      <div>
        <div className={classes.errorMessage}>
          <Alert severity='danger'>
            <Heading level={3} size='xsmall' spacing>
              {t('schema_editor.error_could_not_detect_taskType', {
                layout: selectedFormLayoutSetName,
              })}
            </Heading>
            <Paragraph>{t('schema_editor.error_could_not_detect_taskType_description')}</Paragraph>
          </Alert>
        </div>
      </div>
    );
  }

  const selectedLayoutIsCustomReceipt = selectedFormLayoutSetName === existingCustomReceiptName;
  const shouldShowConfPageToolbar = selectedLayoutIsCustomReceipt || processTaskType === 'payment';
  const confPageToolbarMode = selectedLayoutIsCustomReceipt ? 'receipt' : 'payment';

  if (collapsed) {
    return (
      <StudioButton
        size='small'
        variant='secondary'
        className={classes.openElementsButton}
        onClick={onCollapseToggle}
        title={t('left_menu.open_components')}
      >
        {t('left_menu.open_components')}
      </StudioButton>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.componentsHeader}>
        <Heading size='xxsmall'>{t('left_menu.components')}</Heading>
        <StudioButton
          variant='tertiary'
          icon={<ShrinkIcon title='1' fontSize='1.5rem' />}
          title={t('left_menu.close_components')}
          onClick={onCollapseToggle}
        ></StudioButton>
      </div>
      {hideComponents ? (
        <Paragraph className={classes.noPageSelected} size='small'>
          {t('left_menu.no_components_selected')}
        </Paragraph>
      ) : shouldShowConfPageToolbar ? (
        <ConfPageToolbar confPageType={confPageToolbarMode} />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
