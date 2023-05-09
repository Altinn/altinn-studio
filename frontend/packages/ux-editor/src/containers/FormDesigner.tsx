import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RightMenu } from '../components/rightMenu/RightMenu';
import { DesignView } from './DesignView';
import type { IFormLayoutOrder } from '../types/global';
import { deepCopy } from 'app-shared/pure';
import classes from './FormDesigner.module.css';
import { LeftMenu } from '../components/leftMenu/LeftMenu';

type FormDesignerProps = {
  selectedLayout: string;
  layoutOrder: IFormLayoutOrder;
};
export const FormDesigner = ({
  layoutOrder,
  selectedLayout,
}: FormDesignerProps): JSX.Element => {
  const layoutOrderCopy = deepCopy(layoutOrder || {});

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
