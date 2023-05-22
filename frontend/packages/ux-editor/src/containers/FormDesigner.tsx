import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RightMenu } from '../components/rightMenu/RightMenu';
import { DesignView } from './DesignView';
import classes from './FormDesigner.module.css';
import { LeftMenu } from '../components/leftMenu/LeftMenu';
import { FormContextProvider } from './FormContext';

type FormDesignerProps = {
  selectedLayout: string;
};

export const FormDesigner = ({ selectedLayout, }: FormDesignerProps) => (
  <DndProvider backend={HTML5Backend}>
    <div className={classes.root}>
      <div className={classes.container} id='formFillerGrid'>
        <div className={classes.leftContent + ' ' + classes.item}>
          <LeftMenu />
        </div>
        <FormContextProvider>
            <div className={classes.mainContent + ' ' + classes.item}>
          <h1 className={classes.pageHeader}>{selectedLayout}</h1>
          <DesignView />
        </div>
        <div className={classes.rightContent + ' ' + classes.item}>
          <RightMenu />
        </div></FormContextProvider>
      </div>
    </div>
  </DndProvider>
);
