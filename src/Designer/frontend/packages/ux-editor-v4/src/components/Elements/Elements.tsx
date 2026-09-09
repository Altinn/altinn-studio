import React from 'react';
import { useAppContext, useGetLayoutSetByName } from '../../hooks';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';

import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './Elements.module.css';

import {
  StudioButton,
  StudioError,
  StudioHeading,
  StudioSpinner,
  StudioParagraph,
} from '@studio/components';
import { SidebarLeftIcon } from '@studio/icons';
import { useCustomReceiptLayoutSetName } from 'app-shared/hooks/useCustomReceiptLayoutSetName';
import { useTranslation } from 'react-i18next';
import { useProcessTaskTypeQuery } from '../../hooks/queries/useProcessTaskTypeQuery';
import { ElementsUtils } from './ElementsUtils';
import type { ConfPageType } from './types/ConfigPageType';
import useUxEditorParams from '@altinn/ux-editor-v4/hooks/useUxEditorParams';

export interface ElementsProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Elements = ({ collapsed, onCollapseToggle }: ElementsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutName } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const selectedLayoutSet = useGetLayoutSetByName({
    name: layoutSet,
    org,
    app,
  });

  const {
    data: processTaskType,
    isPending: isFetchingProcessTaskType,
    isError: hasProcessTaskTypeError,
  } = useProcessTaskTypeQuery(org, app, layoutSet);

  const existingCustomReceiptName: string | undefined = useCustomReceiptLayoutSetName(org, app);
  const hideComponents =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  if (isFetchingProcessTaskType) {
    return (
      <div className={classes.root}>
        <StudioSpinner spinnerTitle={t('schema_editor.loading_available_components')} aria-hidden />
      </div>
    );
  }

  if (hasProcessTaskTypeError) {
    return (
      <div>
        <div className={classes.errorMessage}>
          <StudioError>
            <StudioHeading level={3} spacing>
              {t('schema_editor.error_could_not_detect_taskType', {
                layout: layoutSet,
              })}
            </StudioHeading>
            <StudioParagraph>
              {t('schema_editor.error_could_not_detect_taskType_description')}
            </StudioParagraph>
          </StudioError>
        </div>
      </div>
    );
  }

  const selectedLayoutIsCustomReceipt = layoutSet === existingCustomReceiptName;

  const configToolbarMode: ConfPageType = ElementsUtils.getConfigurationMode({
    selectedLayoutIsCustomReceipt,
    processTaskType,
    selectedLayoutSetType: selectedLayoutSet?.type,
  });

  const shouldShowConfPageToolbar: boolean = Boolean(configToolbarMode);

  if (collapsed) {
    return <TogglePanelButton onClick={onCollapseToggle} isCollapsed={collapsed} />;
  }

  return (
    <div className={classes.root}>
      <div className={classes.componentsHeader}>
        <StudioHeading data-size='2xs'>{t('left_menu.components')}</StudioHeading>
        <TogglePanelButton onClick={onCollapseToggle} isCollapsed={collapsed} />
      </div>
      {hideComponents ? (
        <StudioParagraph className={classes.noPageSelected} data-size='sm'>
          {t('left_menu.no_components_selected')}
        </StudioParagraph>
      ) : shouldShowConfPageToolbar ? (
        <ConfPageToolbar confPageType={configToolbarMode} />
      ) : (
        <DefaultToolbar />
      )}
    </div>
  );
};

type TogglePanelButtonProps = {
  onClick: () => void;
  isCollapsed: boolean;
};

const TogglePanelButton = ({ onClick, isCollapsed }: TogglePanelButtonProps) => {
  const { t } = useTranslation();
  const title = isCollapsed ? t('left_menu.open_components') : t('left_menu.close_components');

  return (
    <StudioButton
      variant='tertiary'
      data-color='neutral'
      onClick={onClick}
      title={title}
      icon={<SidebarLeftIcon />}
      className={isCollapsed ? classes.collapsedPanel : undefined}
    />
  );
};
