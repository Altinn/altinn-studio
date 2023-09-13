import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLayoutSetsQuery } from '../../hooks/queries/useLayoutSetsQuery';
import { selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { Button } from '@digdir/design-system-react';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export function LayoutSetsContainer() {
  const { org, app } = useStudioUrlParams();
  const dispatch = useDispatch();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.sets?.map((set) => set.id);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);

  const onLayoutSetClick = (set: string) => {
    dispatch(FormLayoutActions.updateSelectedLayoutSet(set));
    dispatch(FormLayoutActions.updateSelectedLayout(set)); // to edit configs for particular set
    typedLocalStorage.setItem<string>('layoutSet' + app, set);
    // add field in state saying if selectedEditorLevel is 'layout' or 'layoutset'
    // check above state in ux-editor and render layoutset-config if level === 'layoutset'
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
