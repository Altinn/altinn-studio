import React, { useState } from 'react';
import type { IAppState, IToolbarElement } from '../../types/global';
import { ToolbarItem } from './ToolbarItem';
import type { ComponentTypes } from '..';
import { confOnScreenComponents } from '..';
import { getComponentTitleByComponentType } from '../../utils/language';
import { makeGetLayoutOrderSelector } from '../../selectors/getLayoutData';
import { mapComponentToToolbarElement } from '../../utils/formLayout';
import { useDispatch, useSelector } from 'react-redux';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';

export const ConfPageToolbar = () => {
  const dispatch = useDispatch();
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentTypes>(null);
  const activeList: any[] = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const language: any = useSelector((state: IAppState) => state.appData.languageState.language);
  const order: any[] = useSelector(makeGetLayoutOrderSelector());
  const componentList: IToolbarElement[] = confOnScreenComponents.map((component) =>
    mapComponentToToolbarElement(component, language, activeList, order, dispatch)
  );
  const handleComponentInformationOpen = (component: ComponentTypes, event: any) => {
    setCompSelForInfoPanel(component);
    setAnchorElement(event.currentTarget);
  };

  const handleComponentInformationClose = () => {
    setCompSelForInfoPanel(null);
    setAnchorElement(null);
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
      <InformationPanelComponent
        language={language}
        anchorElement={anchorElement}
        informationPanelOpen={Boolean(anchorElement)}
        onClose={handleComponentInformationClose}
        selectedComponent={compSelForInfoPanel}
      />
    </>
  );
};
