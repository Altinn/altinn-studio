import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLayoutSetsQuery } from '../../hooks/queries/useLayoutSetsQuery';
import { selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { Button } from '@digdir/design-system-react';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';

export function LayoutSetsContainer() {
  const { org, app } = useStudioUrlParams();
  const dispatch = useDispatch();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.sets?.map((set) => set.id);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);

  useEffect(() => {
    if (formLayoutSettings) {
      const newSelectedLayout = formLayoutSettings.pages.order[0];
      debugger;
      dispatch(FormLayoutActions.updateSelectedLayout(newSelectedLayout));
    }
  }, [dispatch, formLayoutSettings, selectedLayoutSet]);

  const onLayoutSetClick = (set: string) => {
    dispatch(FormLayoutActions.updateSelectedLayoutSet(set));
    typedLocalStorage.setItem<string>('layoutSet' + app, set);
  };

  return (
    <>
      {layoutSetNames &&
        layoutSetNames.map((set: string) => {
          return (
            <Button
              variant={selectedLayoutSet === set ? 'filled' : 'quiet'}
              key={set}
              onClick={() => onLayoutSetClick(set)}
              size='small'
            >
              {set}
            </Button>
          );
        })}
    </>
  );
}
