import React from 'react';
import { useAppContext, useGetLayoutSetByName } from '../../hooks';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';

import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './Elements.module.css';

import { StudioButton, StudioError, StudioSpinner } from '@studio/components-legacy';
import { ShrinkIcon } from '@studio/icons';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useTranslation } from 'react-i18next';
import { useProcessTaskTypeQuery } from '../../hooks/queries/useProcessTaskTypeQuery';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { ElementsUtils } from './ElementsUtils';
import type { ConfPageType } from './types/ConfigPageType';

export interface ElementsProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Elements = ({ collapsed, onCollapseToggle }: ElementsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, selectedFormLayoutName } = useAppContext();
  const selectedLayoutSet = useGetLayoutSetByName({
    name: selectedFormLayoutSetName,
    org,
    app,
  });

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
          <StudioError>
            <Heading level={3} size='xsmall' spacing>
              {t('schema_editor.error_could_not_detect_taskType', {
                layout: selectedFormLayoutSetName,
              })}
            </Heading>
            <Paragraph>{t('schema_editor.error_could_not_detect_taskType_description')}</Paragraph>
          </StudioError>
        </div>
      </div>
    );
  }

  const selectedLayoutIsCustomReceipt = selectedFormLayoutSetName === existingCustomReceiptName;

  const configToolbarMode: ConfPageType = ElementsUtils.getConfigurationMode({
    selectedLayoutIsCustomReceipt,
    processTaskType,
    selectedLayoutSetType: selectedLayoutSet?.type,
  });

  const shouldShowConfPageToolbar: boolean = Boolean(configToolbarMode);

  if (collapsed) {
    return (
      <StudioButton
        variant='secondary'
        className={classes.openElementsButton}
        onClick={onCollapseToggle}
        title={t('left_menu.open_components')}
        fullWidth
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
        <ConfPageToolbar confPageType={configToolbarMode} />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};
