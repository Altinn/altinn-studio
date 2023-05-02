import React, { useState } from 'react';
import type { ComponentType } from '..';
import type { IToolbarElement } from '../../types/global';
import { InformationPanelComponent } from '../toolbar/InformationPanelComponent';
import { ToolbarItem } from './ToolbarItem';
import { confOnScreenComponents } from '..';
import { getComponentTitleByComponentType } from '../../utils/language';
import { mapComponentToToolbarElement } from '../../utils/formLayoutUtils';
import { useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../../selectors/formLayoutSelectors';
import { useAddFormComponentMutation } from '../../hooks/mutations/useAddFormComponentMutation';
import { useAddFormContainerMutation } from '../../hooks/mutations/useAddFormContainerMutation';

export const ConfPageToolbar = () => {
  const dispatch = useDispatch();
  const [anchorElement, setAnchorElement] = useState<any>(null);
  const [compSelForInfoPanel, setCompSelForInfoPanel] = useState<ComponentType>(null);
  const { order } = useFormLayoutsSelector(selectedLayoutSelector);
  const { app, org } = useParams();
  const addFormComponentMutation = useAddFormComponentMutation(org, app);
  const addFormContainerMutation = useAddFormContainerMutation(org, app);
  const { t } = useTranslation();
  const componentList: IToolbarElement[] = confOnScreenComponents.map(
    (component) => mapComponentToToolbarElement(
      component,
      t,
      order,
      dispatch,
      addFormComponentMutation,
      addFormContainerMutation,
    )
  );
  const handleComponentInformationOpen = (component: ComponentType, event: any) => {
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
