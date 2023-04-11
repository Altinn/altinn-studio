import React, { useState } from 'react';
import type { ComponentTypes } from '..';
import type { IAppState, IToolbarElement } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { ToolbarItem } from './ToolbarItem';
import { confOnScreenComponents } from '..';
import { getComponentTitleByComponentType } from '../../utils/language';
import { makeGetLayoutOrderSelector } from '../../selectors/getLayoutData';
import { mapComponentToToolbarElement } from '../../utils/formLayout';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const ConfPageToolbar = () => {
  const dispatch = useDispatch();
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentTypes>(null);
  const activeList: any[] = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const order: any[] = useSelector(makeGetLayoutOrderSelector());
  const { app, org } = useParams();
  const { t } = useTranslation();
  const componentList: IToolbarElement[] = confOnScreenComponents.map((component) =>
    mapComponentToToolbarElement(component, t, activeList, order, dispatch, { app, org })
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
          text={getComponentTitleByComponentType(component.type, t) || component.label}
          icon={component.icon}
          componentType={component.type}
          onDropAction={component.actionMethod}
          onClick={handleComponentInformationOpen}
          key={component.type}
        />
      ))}
      <InformationPanelComponent
        anchorElement={anchorElement}
        informationPanelOpen={Boolean(anchorElement)}
        onClose={handleComponentInformationClose}
        selectedComponent={compSelForInfoPanel}
      />
    </>
  );
};
