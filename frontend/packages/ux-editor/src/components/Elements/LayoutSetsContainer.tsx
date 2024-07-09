import React, { useEffect } from 'react';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { NativeSelect } from '@digdir/designsystemet-react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useText, useAppContext } from '../../hooks';
import classes from './LayoutSetsContainer.module.css';

export function LayoutSetsContainer() {
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.sets?.map((set) => set.id);
  const t = useText();
  const {
    selectedFormLayoutSetName,
    setSelectedFormLayoutSetName,
    setSelectedFormLayoutName,
    refetchLayouts,
    refetchLayoutSettings,
    onLayoutSetNameChange,
  } = useAppContext();

  useEffect(() => {
    onLayoutSetNameChange(selectedFormLayoutSetName);
  }, [onLayoutSetNameChange, selectedFormLayoutSetName]);

  const onLayoutSetClick = async (set: string) => {
    if (selectedFormLayoutSetName !== set) {
      await refetchLayouts(set);
      await refetchLayoutSettings(set);

      setSelectedFormLayoutSetName(set);
      setSelectedFormLayoutName(undefined);
      onLayoutSetNameChange(set);
    }
  };

  if (!layoutSetNames) return null;

  return (
    <div className={classes.dropDownContainer}>
      <NativeSelect
        label={t('left_menu.layout_dropdown_menu_label')}
        onChange={(event) => onLayoutSetClick(event.target.value)}
        value={selectedFormLayoutSetName}
        className={classes.layoutSetsDropDown}
      >
        {layoutSetNames.map((set: string) => {
          return (
            <option key={set} value={set}>
              {set}
            </option>
          );
        })}
      </NativeSelect>
    </div>
  );
}
