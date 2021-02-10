/* eslint-disable max-len */
/* eslint-disable import/no-cycle */
import List from '@material-ui/core/List';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mapComponentToToolbarElement, mapWidgetToToolbarElement } from '../utils/formLayout';
import { advancedComponents, ComponentTypes, schemaComponents, textComponents } from '../components';
import { InformationPanelComponent } from '../components/toolbar/InformationPanelComponent';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { ToolbarGroup } from './ToolbarGroup';

import '../styles/toolBar.css';

export interface IToolbarElement {
  label: string;
  icon?: string;
  type: string;
  actionMethod: (containerId: string, index: number) => void;
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

export enum CollapsableMenus {
  Components,
  Texts,
  AdvancedComponents,
  Widgets,
}

export interface IToolbarProvidedProps {
  classes: any;
}

export interface IToolbarProps extends IToolbarProvidedProps {
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
  thirdPartyComponents: any;
  activeContainer: string;
  activeList: any[];
  language: any;
  order: any[];
}

export function Toolbar() {
  const dispatch = useDispatch();
  const [componentInformationPanelOpen, setComponentInformationPanelOpen] = React.useState<boolean>(false);
  const [componentSelectedForInformationPanel, setComponentSelectedForInformationPanel]
    = React.useState<ComponentTypes>(null);
  const [anchorElement, setAnchorElement] = React.useState<any>(null);
  const [componentListOpen, setComponentListOpen] = React.useState<boolean>(true);
  const [componentListCloseAnimationDone, setComponentListCloseAnimationDone] = React.useState<boolean>(false);
  const [textListOpen, setTextListOpen] = React.useState<boolean>(false);
  const [textListCloseAnimationDone, setTextListCloseAnimationDone] = React.useState<boolean>(false);
  const [advancedComponentListOpen, setAdvancedComponentListOpen] = React.useState<boolean>(false);
  const [advancedComponentListCloseAnimationDone, setAdvancedComponentListCloseAnimationDone]
    = React.useState<boolean>(false);
  const [widgetComponentListOpen, setWidgetComponentListOpen] = React.useState<boolean>(false);
  const [widgetComponentListCloseAnimationDone, setWidgetComponentListCloseAnimationDone]
      = React.useState<boolean>(false);

  const activeList: any[] = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const language: any = useSelector((state: IAppState) => state.appData.languageState.language);
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const order: any[] = useSelector((state: IAppState) => GetLayoutOrderSelector(state));
  const widgetsList: IWidget[] = useSelector((state: IAppState) => state.widgets.widgets);

  const componentList: IToolbarElement[] = schemaComponents.map((component) => {
    return mapComponentToToolbarElement(component, language, activeList, order, dispatch);
  });
  const textComponentList: IToolbarElement[] = textComponents.map((component: any) => {
    return mapComponentToToolbarElement(component, language, activeList, order, dispatch);
  });
  const advancedComponentsList: IToolbarElement[] = advancedComponents.map((component: any) => {
    return mapComponentToToolbarElement(component, language, activeList, order, dispatch);
  });
  const widgetComponentsList: IToolbarElement[] = widgetsList.map((widget: any) => {
    return mapWidgetToToolbarElement(widget, activeList, order, language, dispatch);
  });

  const handleComponentInformationOpen = (component: ComponentTypes, event: any) => {
    setComponentInformationPanelOpen(true);
    setComponentSelectedForInformationPanel(component);
    setAnchorElement(event.currentTarget);
  };

  const handleComponentInformationClose = () => {
    setComponentInformationPanelOpen(false);
    setComponentSelectedForInformationPanel(null);
    setAnchorElement(null);
  };

  const handleCollapsableListClicked = (menu: CollapsableMenus) => {
    switch (menu) {
      case CollapsableMenus.Components: {
        setComponentListOpen(!componentListOpen);
        break;
      }
      case CollapsableMenus.Texts: {
        setTextListOpen(!textListOpen);
        break;
      }
      case CollapsableMenus.AdvancedComponents: {
        setAdvancedComponentListOpen(!advancedComponentListOpen);
        break;
      }
      case CollapsableMenus.Widgets: {
        setWidgetComponentListOpen(!widgetComponentListOpen);
        break;
      }
      default:
        break;
    }
  };

  const setCollapsableListAnimationState = (list: string, done: boolean) => {
    switch (list) {
      case 'schema': {
        setComponentListCloseAnimationDone(done);
        break;
      }
      case 'text': {
        setTextListCloseAnimationDone(done);
        break;
      }
      case 'advanced': {
        setAdvancedComponentListCloseAnimationDone(done);
        break;
      }
      case 'widget': {
        setWidgetComponentListCloseAnimationDone(done);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className='col-sm-12'>
      <List
        id='collapsable-items'
        tabIndex={-1}
        component='div'
      >
        <ToolbarGroup
          key='schema'
          list='schema'
          menuType={CollapsableMenus.Components}
          components={componentList}
          componentListCloseAnimationDone={componentListCloseAnimationDone}
          componentListOpen={componentListOpen}
          handleCollapsableListClicked={handleCollapsableListClicked}
          handleComponentInformationOpen={handleComponentInformationOpen}
          language={language}
          setCollapsableListAnimationState={setCollapsableListAnimationState}
        />
        <ToolbarGroup
          key='text'
          list='text'
          menuType={CollapsableMenus.Texts}
          components={textComponentList}
          componentListCloseAnimationDone={textListCloseAnimationDone}
          componentListOpen={textListOpen}
          handleCollapsableListClicked={handleCollapsableListClicked}
          handleComponentInformationOpen={handleComponentInformationOpen}
          language={language}
          setCollapsableListAnimationState={setCollapsableListAnimationState}
        />
        <ToolbarGroup
          key='advanced'
          list='advanced'
          menuType={CollapsableMenus.AdvancedComponents}
          components={advancedComponentsList}
          componentListCloseAnimationDone={advancedComponentListCloseAnimationDone}
          componentListOpen={advancedComponentListOpen}
          handleCollapsableListClicked={handleCollapsableListClicked}
          handleComponentInformationOpen={handleComponentInformationOpen}
          language={language}
          setCollapsableListAnimationState={setCollapsableListAnimationState}
        />
        <ToolbarGroup
          key='widget'
          list='widget'
          menuType={CollapsableMenus.Widgets}
          components={widgetComponentsList}
          componentListCloseAnimationDone={widgetComponentListCloseAnimationDone}
          componentListOpen={widgetComponentListOpen}
          handleCollapsableListClicked={handleCollapsableListClicked}
          handleComponentInformationOpen={handleComponentInformationOpen}
          language={language}
          setCollapsableListAnimationState={setCollapsableListAnimationState}
        />
      </List >

      <InformationPanelComponent
        anchorElement={anchorElement}
        informationPanelOpen={componentInformationPanelOpen}
        onClose={handleComponentInformationClose}
        selectedComponent={componentSelectedForInformationPanel}
      />
    </div >
  );
}
