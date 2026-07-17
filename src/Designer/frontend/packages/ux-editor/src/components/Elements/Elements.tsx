import React from 'react';
import { useAppContext } from '../../hooks';
import { ConfPageToolbar } from './ConfPageToolbar';
import { DefaultToolbar } from './DefaultToolbar';

import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './Elements.module.css';

import { StudioButton, StudioHeading } from '@studio/components';
import { SidebarLeftIcon } from '@studio/icons';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { useTranslation } from 'react-i18next';
import { useLayoutSetsExtendedQuery } from '../../hooks/queries/useLayoutSetsExtendedQuery';
import { Paragraph } from '@digdir/designsystemet-react';
import { ElementsUtils } from './ElementsUtils';
import type { ConfPageType } from './types/ConfigPageType';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';

export interface ElementsProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
}

export const Elements = ({ collapsed, onCollapseToggle }: ElementsProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutName } = useAppContext();
  const { layoutSet } = useUxEditorParams();
  const { data: layoutSets } = useLayoutSetsExtendedQuery(org, app);

  const hideComponents =
    selectedFormLayoutName === 'default' || selectedFormLayoutName === undefined;

  const selectedLayoutSet = layoutSets?.find((set) => set.id === layoutSet);

  const configToolbarMode: ConfPageType = ElementsUtils.getConfigurationMode({
    selectedLayoutIsCustomReceipt: selectedLayoutSet?.id === PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    processTaskType: selectedLayoutSet?.taskType,
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
