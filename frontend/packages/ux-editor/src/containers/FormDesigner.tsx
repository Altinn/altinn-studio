import React, { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { RightMenu } from '../components/rightMenu/RightMenu';
import { DesignView } from './DesignView';
import type { IDataModelFieldElement, IFormLayoutOrder } from '../types/global';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { deepCopy } from 'app-shared/pure';
import classes from './FormDesigner.module.css';
import { LeftMenu } from '../components/leftMenu/LeftMenu';
import { useText } from '../hooks';
import { useParams } from 'react-router-dom';

type FormDesignerProps = {
  selectedLayout: string;
  dataModel: IDataModelFieldElement[];
  activeList: any;
  layoutOrder: IFormLayoutOrder;
};
export const FormDesigner = ({
  activeList,
  layoutOrder,
  selectedLayout,
  dataModel,
}: FormDesignerProps): JSX.Element => {
  const dispatch = useDispatch();
  const { org, app } = useParams();
  const order = useSelector(makeGetLayoutOrderSelector());
  const layoutOrderCopy = deepCopy(layoutOrder || {});
  const t = useText();

  useEffect((): void => {
    const addInitialPage = (): void => {
      const name = `${t('general.page')}1`;
      dispatch(FormLayoutActions.addLayout({ layout: name, isReceiptPage: false, org, app }));
    };

    const layoutsExist = layoutOrder && !Object.keys(layoutOrder).length;
    // Old apps might have selectedLayout='default' even when there exist a single layout.
    // Should only add initial page if no layouts exist.
    if (selectedLayout === 'default' && !layoutsExist) {
      addInitialPage();
    }
  }, [app, dispatch, org, selectedLayout, t, layoutOrder]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={classes.root}>
        <div className={classes.container} id='formFillerGrid'>
          <div className={classes.leftContent + ' ' + classes.item}>
            <LeftMenu />
          </div>
          <div className={classes.mainContent + ' ' + classes.item}>
            <h1 className={classes.pageHeader}>{selectedLayout}</h1>
            <DesignView
              order={order}
              activeList={activeList}
              isDragging={false}
              layoutOrder={layoutOrderCopy}
            />
          </div>
          <div className={classes.rightContent + ' ' + classes.item}>
            <RightMenu />
          </div>
        </div>
      </div>
    </DndProvider>
  );
};
