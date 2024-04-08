import React from 'react';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { NativeSelect } from '@digdir/design-system-react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useText } from '../../hooks';
import classes from './LayoutSetsContainer.module.css';
import { useAppContext } from '../../hooks/useAppContext';

export function LayoutSetsContainer() {
  const { org, app } = useStudioUrlParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.sets?.map((set) => set.id);
  const t = useText();
  const { selectedLayoutSet, setSelectedLayoutSet } = useAppContext();

  const onLayoutSetClick = (set: string) => {
    if (selectedLayoutSet !== set) {
      setSelectedLayoutSet(set);
    }
  };

  if (!layoutSetNames) return null;

  return (
    <div className={classes.dropDownContainer}>
      <NativeSelect
        label={t('left_menu.layout_dropdown_menu_label')}
        onChange={(event) => onLayoutSetClick(event.target.value)}
        value={selectedLayoutSet}
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
