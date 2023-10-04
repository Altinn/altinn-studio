import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLayoutSetsQuery } from '../../hooks/queries/useLayoutSetsQuery';
import { selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { NativeSelect } from '@digdir/design-system-react';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useText } from '../../hooks';
import classes from './LayoutSetsContainer.module.css';

export function LayoutSetsContainer() {
  const { org, app } = useStudioUrlParams();
  const dispatch = useDispatch();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.sets?.map((set) => set.id);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const t = useText();

  const onLayoutSetClick = (set: string) => {
    dispatch(FormLayoutActions.updateSelectedLayoutSet(set));
    typedLocalStorage.setItem<string>('layoutSet/' + app, set);
  };
  
  if (!layoutSetNames) return null;

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
