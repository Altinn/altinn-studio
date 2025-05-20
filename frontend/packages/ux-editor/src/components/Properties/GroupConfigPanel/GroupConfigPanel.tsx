import React from 'react';
import { StudioFieldset, StudioSwitch } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components-legacy';
import { FileIcon } from '@studio/icons';
import { useAppContext } from '../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePagesQuery } from '../../../hooks/queries/usePagesQuery';
import { useChangePageGroupOrder } from '@altinn/ux-editor/hooks/mutations/useChangePageGroupOrder';
import classes from './GroupConfigPanel.module.css';

export const GroupConfigPanel = () => {
  const { t } = useTranslation();
  const { selectedItem, selectedFormLayoutSetName } = useAppContext();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: changePageGroup, isPending: mutatingPages } = useChangePageGroupOrder(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { data: pages } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const selectedGroup = pages.groups[selectedItem?.id];

  const onMarkAsCompleted = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectedGroup.markWhenCompleted = event.target.checked;
    pages.groups[selectedItem?.id] = selectedGroup;
    changePageGroup(pages);
  };

  return (
    <>
      <StudioSectionHeader
        data-testid='groupConfigPanel'
        icon={<FileIcon />}
        heading={{
          text: selectedGroup.name,
          level: 2,
        }}
      />
      <div className={classes.configPanel}>
        <div className={classes.fieldSetWrapper}>
          <StudioFieldset>
            <StudioSwitch
              label={t('ux_editor.page_group.markAsCompleted_switch')}
              position='end'
              readOnly={mutatingPages}
              checked={selectedGroup.markWhenCompleted}
              onChange={onMarkAsCompleted}
            ></StudioSwitch>
          </StudioFieldset>
        </div>
      </div>
    </>
  );
};
