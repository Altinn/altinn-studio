import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';
import {useLayoutSetsQuery} from "../../hooks/queries/useLayoutSetsQuery";
import {selectedLayoutSetSelector} from "../../selectors/formLayoutSelectors";
import {FormLayoutActions} from "../../features/formDesigner/formLayout/formLayoutSlice";
import { Button, ButtonVariant } from '@digdir/design-system-react';

export function LayoutSetsContainer() {
  const { org, app } = useParams();
  const dispatch = useDispatch();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSets = layoutSetsQuery.data?.sets?.map(set => set.id);
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);

  const onLayoutSetClick=(set: string) => {
      dispatch(FormLayoutActions.updateSelectedLayoutSet(set));
      dispatch(FormLayoutActions.updateSelectedLayout(set));
  };

  return (
    <>
      {layoutSets && (layoutSets.map((set: string) => {
        return <Button variant={selectedLayoutSet === set ? ButtonVariant.Filled : ButtonVariant.Quiet} onClick={() => onLayoutSetClick(set)}>
          {set}
        </Button>;
      }))}
    </>
  );
}
