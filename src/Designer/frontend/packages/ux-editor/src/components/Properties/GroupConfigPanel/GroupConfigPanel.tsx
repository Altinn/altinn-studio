import React from 'react';
import {
  StudioFieldset,
  StudioSpinner,
  StudioSwitch,
  StudioRadio,
  useStudioRadioGroup,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { FileIcon, InformationIcon, TasklistIcon } from '@studio/icons';
import type { ItemType } from '../ItemType';
import type { SelectedItem } from '../../../AppContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { usePagesQuery } from '../../../hooks/queries/usePagesQuery';
import { useChangePageGroupOrder } from '../../../hooks/mutations/useChangePageGroupOrder';
import classes from './GroupConfigPanel.module.css';
import { GroupType } from 'app-shared/types/api/dto/PageModel';
import { isPagesModelWithGroups } from 'app-shared/types/api/dto/PagesModel';
import { changeGroupName } from '../../../utils/pageGroupUtils';
import { EditName } from '../../config/EditName';
import useUxEditorParams from '@altinn/ux-editor/hooks/useUxEditorParams';
import { ConfigPanelHeader } from '../CommonElements/ConfigPanelHeader/ConfigPanelHeader';
import { MainSettingsHeader } from '../CommonElements/MainSettingsHeader/MainSettingsHeader';

export type GroupConfigPanelProps = {
  selectedItem: Extract<SelectedItem, { type: ItemType.Group }>;
};

export const GroupConfigPanel = ({ selectedItem }: GroupConfigPanelProps) => {
  const { t } = useTranslation();
  const { layoutSet } = useUxEditorParams();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: pageGroupMutation, isPending: mutatingPages } = useChangePageGroupOrder(
    org,
    app,
    layoutSet,
  );
  const { data: pages, isPending: pageQueryPending } = usePagesQuery(org, app, layoutSet);

  const selectedGroupType =
    !pageQueryPending && isPagesModelWithGroups(pages) && pages?.groups[selectedItem.id]?.type;

  const { getRadioProps } = useStudioRadioGroup({
    value: selectedGroupType || GroupType.Data,
    onChange: (value) => onChangeGroupType(value as GroupType),
  });

  if (pageQueryPending) return <StudioSpinner aria-label={t('general.loading')} />;
  if (!isPagesModelWithGroups(pages)) return;
  const selectedGroup = pages.groups[selectedItem.id];

  const onMarkAsCompleted = (event: React.ChangeEvent<HTMLInputElement>) => {
    const updatedPages = { ...pages };
    updatedPages.groups[selectedItem.id].markWhenCompleted = event.target.checked;
    pageGroupMutation(updatedPages);
  };

  const onChangeGroupType = (typeValue: GroupType) => {
    const updatedPages = { ...pages };
    updatedPages.groups[selectedItem.id].type = typeValue;

    pageGroupMutation(updatedPages);
  };

  const onChangeGroupName = (name: string) => {
    const updatedPages = {
      ...pages,
      groups: changeGroupName(pages.groups, selectedItem.id, name),
    };
    pageGroupMutation(updatedPages);
  };

  return (
    <>
      <ConfigPanelHeader icon={<FileIcon />} title={selectedGroup.name} />
      <MainSettingsHeader />
      <div className={classes.configPanel}>
        {selectedGroup.order.length > 1 && (
          <div className={classes.editGroupNameWrapper}>
            <EditName
              className={classes.editName}
              label={t('ux_editor.page_group.name')}
              name={selectedGroup.name}
              onChange={onChangeGroupName}
            />
          </div>
        )}
        <div className={classes.fieldSetWrapper}>
          <StudioSwitch
            label={t('ux_editor.page_group.markAsCompleted_switch')}
            position='end'
            readOnly={mutatingPages}
            checked={selectedGroup.markWhenCompleted || false}
            onChange={onMarkAsCompleted}
          ></StudioSwitch>
          <StudioFieldset legend={t('ux_editor.page_group.select_type_title')}>
            <StudioRadio
              label={
                <div className={classes.radioLabel}>
                  <span className={classes.radioLabelText}>
                    {t('ux_editor.page_group.select_data_type')}
                  </span>
                  <TasklistIcon className={classes.radioLabelIcon} />
                </div>
              }
              className={classes.radio}
              {...getRadioProps({ value: GroupType.Data })}
            />
            <StudioRadio
              label={
                <div className={classes.radioLabel}>
                  <span className={classes.radioLabelText}>
                    {t('ux_editor.page_group.select_info_type')}
                  </span>
                  <InformationIcon className={classes.radioLabelIcon} />
                </div>
              }
              className={classes.radio}
              {...getRadioProps({ value: GroupType.Info })}
            />
          </StudioFieldset>
        </div>
      </div>
    </>
  );
};
