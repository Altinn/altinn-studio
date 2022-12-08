import React from 'react';
import type { IAppState } from '../../types/global';
import type { IToolbarElement } from '../../containers/Toolbar';
import { ToolbarItem } from '../../containers/ToolbarItem';
import { confOnScreenComponents } from '../index';
import { getComponentTitleByComponentType } from '../../utils/language';
import { makeGetLayoutOrderSelector } from '../../selectors/getLayoutData';
import { mapComponentToToolbarElement } from '../../utils/formLayout';
import { useDispatch, useSelector } from 'react-redux';

export const ConfPageToolbar = () => {
  const dispatch = useDispatch();
  const activeList: any[] = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const language: any = useSelector((state: IAppState) => state.appData.languageState.language);
  const order: any[] = useSelector(makeGetLayoutOrderSelector());
  const componentList: IToolbarElement[] = confOnScreenComponents.map((component) =>
    mapComponentToToolbarElement(component, language, activeList, order, dispatch)
  );
  const handleComponentInformationOpen = () => {
    console.log('Clicked');
  };
  return (
    <>
      {componentList.map((component: IToolbarElement) => (
        <ToolbarItem
          text={getComponentTitleByComponentType(component.type, language) || component.label}
          icon={component.icon}
          componentType={component.type}
          onDropAction={component.actionMethod}
          onClick={handleComponentInformationOpen}
          key={component.type}
        />
      ))}
    </>
  );
};
