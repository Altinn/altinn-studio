import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useLayoutSetsQuery } from "../../hooks/queries/useLayoutSetsQuery";
import { selectedLayoutSetSelector } from "../../selectors/formLayoutSelectors";
import { FormLayoutActions } from "../../features/formDesigner/formLayout/formLayoutSlice";
import { Button, ButtonVariant } from '@digdir/design-system-react';

export function LayoutSetsContainer() {
  const { org, app } = useParams();
  const dispatch = useDispatch();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery.data?.sets?.map(set => set.id);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);

  const onLayoutSetClick=(set: string) => {
      dispatch(FormLayoutActions.updateSelectedLayoutSet(set));
      dispatch(FormLayoutActions.updateSelectedLayout(set)); // to edit configs for particular set
    // TODO: invalidate layouts, so new layouts can be fetched with the new selected layout set name - or is it already working?
    // add field in state saying if selectedEditorLevel is 'layout' or 'layoutset'
    // check above state in ux-editor and render layoutset-config if level === 'layoutset'
  };

  return (
    <>
      {layoutSetNames && (layoutSetNames.map((set: string) => {
        return <Button
          variant={selectedLayoutSet === set ? ButtonVariant.Filled : ButtonVariant.Quiet}
          key={set}
          onClick={() => onLayoutSetClick(set)}>
          {set}
        </Button>;
      }))}
    </>
  );
}
