import { Collapse, createStyles, Theme, withStyles } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import InputAdornment from '@material-ui/core/InputAdornment';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import classNames = require('classnames');
import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { ComponentTypes, IComponent, schemaComponents, textComponents } from '../components';
import { EditModalContent } from '../components/config/EditModalContent';
import { CollapsableMenuComponent } from '../components/toolbar/CollapsableMenuComponent';
import { ConditionalRenderingModalComponent } from '../components/toolbar/ConditionalRenderingModal';
import { ExternalApiModalComponent } from '../components/toolbar/ExternalApiModal';
import { InformationPanelComponent } from '../components/toolbar/InformationPanelComponent';
import { ListSelectorComponent } from '../components/toolbar/ListSelectorComponent';
import { RuleModalComponent } from '../components/toolbar/RuleModalComponent';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';

import { ToolbarItem } from './ToolbarItem';

import '../styles/toolBar.css';

const THIRD_PARTY_COMPONENT: string = 'ThirdParty';

export interface IToolbarElement {
  label: string;
  componentType: ComponentTypes;
  actionMethod: (containerId: string, index: number) => void;
}

export enum LayoutItemType {
  Container = 'CONTAINER',
  Component = 'COMPONENT',
}

export enum CollapsableMenus {
  Components,
  Texts,
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
export interface IToolbarState {
  modalOpen: boolean;
  selectedComp: any;
  selectedCompId: string;
  componentInformationPanelOpen: boolean;
  componentSelectedForInformationPanel: ComponentTypes;
  anchorElement: any;
  componentListOpen: boolean;
  componentListCloseAnimationDone: boolean;
  textListOpen: boolean;
  textListCloseAnimationDone: boolean;
}
class ToolbarClass extends React.Component<IToolbarProps, IToolbarState> {
  public components: IToolbarElement[];
  public textComponents: IToolbarElement[];

  constructor(props: IToolbarProps, state: IToolbarState) {
    super(props, state);
    this.state = {
      modalOpen: false,
      selectedComp: {},
      selectedCompId: '',
      componentInformationPanelOpen: false,
      componentSelectedForInformationPanel: -1,
      anchorElement: null,
      componentListOpen: true,
      componentListCloseAnimationDone: false,
      textListOpen: true,
      textListCloseAnimationDone: false,
    };
    this.components = schemaComponents.map(this.mapComponentToToolbarElement);
    this.textComponents = textComponents.map(this.mapComponentToToolbarElement);
  }

  public mapComponentToToolbarElement = (c: IComponent): IToolbarElement => {
    const customProperties = c.customProperties ? c.customProperties : {};
    return {
      componentType: c.Type,
      label: c.name,
      actionMethod: (containerId: string, position: number) => {
        FormDesignerActionDispatchers.addFormComponent({
          component: c.name,
          itemType: LayoutItemType.Component,
          title: c.name,
          ...JSON.parse(JSON.stringify(customProperties)),
        },
          position,
          containerId,
        );
        this.updateActiveListOrder();
      },
    } as IToolbarElement;
  }

  public updateActiveListOrder() {
    FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order);
  }

  public addContainerToLayout(containerId: string, index: number) {
    FormDesignerActionDispatchers.addFormContainer({
      repeating: false,
      dataModelGroup: null,
      index: 0,

    } as ICreateFormContainer,
      null,
      containerId,
      null,
      index,
    );
  }

  public addThirdPartyComponentToLayout = (componentPackage: string, componentName: string) => {
    FormDesignerActionDispatchers.addFormComponent({
      component: THIRD_PARTY_COMPONENT,
      title: `${componentPackage}.${componentName}`,
    },
      null,
    );
  }

  public getThirdPartyComponents = (): IToolbarElement[] => {
    const { thirdPartyComponents } = this.props;
    if (!thirdPartyComponents) {
      return [];
    }
    const thirdPartyComponentArray: IToolbarElement[] = [];
    for (const packageName of thirdPartyComponents) {
      for (const componentName of thirdPartyComponents[packageName]) {
        thirdPartyComponentArray.push({
          label: `${packageName} - ${componentName}`,
          componentType: null,
          actionMethod: FormDesignerActionDispatchers.addFormComponent({
            component: THIRD_PARTY_COMPONENT,
            title: `${packageName}.${componentName}`,
          },
            null,
          ) as any,
        });
      }
    }
    return thirdPartyComponentArray;
  }

  public handleNext(component: any, id: string) {
    this.setState({
      selectedComp: component,
      selectedCompId: id,
      modalOpen: true,
    });
  }

  public handleSaveChange = (callbackComponent: FormComponentType): void => {
    this.handleComponentUpdate(callbackComponent);
    this.handleCloseModal();
  }

  public handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    FormDesignerActionDispatchers.updateFormComponent(
      updatedComponent,
      this.state.selectedCompId,
      this.props.activeContainer,
    );
  }

  public handleCloseModal = (): void => {
    this.setState({
      modalOpen: false,
    });
  }

  public handleComponentInformationOpen = (component: ComponentTypes, event: any) => {
    this.setState({
      componentInformationPanelOpen: true,
      componentSelectedForInformationPanel: component,
      anchorElement: event.currentTarget,
    });
  }

  public handleComponentInformationClose = () => {
    this.setState({
      componentInformationPanelOpen: false,
      componentSelectedForInformationPanel: -1,
      anchorElement: null,
    });
  }

  public handleCollapsableListClicked = (menu: CollapsableMenus) => {
    if (menu === CollapsableMenus.Components) {
      this.setState({
        componentListOpen: !this.state.componentListOpen,
      });
    } else {
      this.setState({
        textListOpen: !this.state.textListOpen,
      });
    }
  }

  public handleComponentListChange = (value: any) => {
    // Ignore for now, favourites will be implemented at a later stage
  }

  public setCollapsableListAnimationState = (list: string, done: boolean) => {
    if (list === 'schema') {
      this.setState({
        componentListCloseAnimationDone: done,
      });
    } else if (list === 'text') {
      this.setState({
        textListCloseAnimationDone: done,
      });
    }
  }

  public render() {
    return (
      <div className={'col-sm-12'} style={{ padding: '24px' }}>
        <FormControl
          classes={{ root: classNames(this.props.classes.searchBox) }}
          fullWidth={true}
        >
          <TextField
            id={'component-search'}
            placeholder={this.props.language.ux_editor.toolbar_component_search}
            InputProps={{
              disableUnderline: true,
              endAdornment:
                <InputAdornment position={'end'} classes={{ root: classNames(this.props.classes.searchBoxIcon) }}>
                  <i className={'ai ai-search'} />
                </InputAdornment>,
              classes: { root: classNames(this.props.classes.searchBoxInput) },
            }}
          />
        </FormControl>
        <List id='collapsable-items' tabIndex={-1}>

          <ListSelectorComponent onChange={this.handleComponentListChange} />

          <CollapsableMenuComponent
            menuIsOpen={this.state.componentListOpen}
            onClick={this.handleCollapsableListClicked}
            menuType={CollapsableMenus.Components}
          />

          <Collapse
            in={this.state.componentListOpen}
            onExited={this.setCollapsableListAnimationState.bind(this, 'schema', true)}
            onEnter={this.setCollapsableListAnimationState.bind(this, 'schema', false)}
            style={this.state.componentListCloseAnimationDone ? { display: 'none' } : {}}
            classes={{
              container: this.props.classes.collapsableContainer,
            }}
          >
            <List
              dense={false}
              id='schema-components'
            >
              {this.components.map((component: IToolbarElement) => (
                <ToolbarItem
                  text={component.label}
                  componentType={component.componentType}
                  onDropAction={component.actionMethod}
                  onClick={this.handleComponentInformationOpen}
                />
              ))
              }

              {this.getThirdPartyComponents().map((component: IToolbarElement) => (
                <ToolbarItem
                  text={component.label}
                  componentType={component.componentType}
                  onDropAction={this.addThirdPartyComponentToLayout.bind(null, component, component.label)}
                  onClick={this.handleComponentInformationOpen}
                />
              ))}
              <ToolbarItem
                text={this.props.language.ux_editor.container}
                onClick={this.handleComponentInformationOpen}
                onDropAction={this.addContainerToLayout}
                componentType={ComponentTypes.Container}
              />
            </List>
          </Collapse>
          <CollapsableMenuComponent
            menuIsOpen={this.state.textListOpen}
            onClick={this.handleCollapsableListClicked}
            menuType={CollapsableMenus.Texts}
          />
          <Collapse
            in={this.state.textListOpen}
            onExited={this.setCollapsableListAnimationState.bind(this, 'text', true)}
            onEnter={this.setCollapsableListAnimationState.bind(this, 'text', false)}
            style={this.state.textListCloseAnimationDone ? { display: 'none' } : {}}
            classes={{
              container: this.props.classes.collapsableContainer,
            }}
          >
            <List dense={false} id={'schema-texts'}>
              {this.textComponents.map((component: IToolbarElement) => (
                <ToolbarItem
                  text={component.label}
                  componentType={component.componentType}
                  onClick={this.handleComponentInformationOpen}
                  onDropAction={component.actionMethod}
                />
              ))}
            </List>
          </Collapse>
        </List >

        <div className='d-block'>
          <ExternalApiModalComponent />
        </div>
        <div className='d-block'>
          <RuleModalComponent />
        </div>
        <div className='d-block'>
          <ConditionalRenderingModalComponent />
        </div>
        <Modal
          isOpen={this.state.modalOpen}
          onRequestClose={this.handleCloseModal}
          ariaHideApp={false}
          contentLabel={'Input edit'}
          className='react-modal a-modal-content-target a-page a-current-page modalPage'
          overlayClassName='react-modal-overlay '
        >
          <EditModalContent
            component={this.state.selectedComp}
            saveEdit={this.handleSaveChange}
            cancelEdit={this.handleCloseModal}
            dataModel={this.props.dataModel}
            textResources={this.props.textResources}
            language={this.props.language}
          />
        </Modal>
        <InformationPanelComponent
          anchorElement={this.state.anchorElement}
          informationPanelOpen={this.state.componentInformationPanelOpen}
          onClose={this.handleComponentInformationClose}
          selectedComponent={this.state.componentSelectedForInformationPanel}
        />
      </div >
    );
  }

}

const styles = (theme: Theme) => createStyles({
  searchBox: {
    border: '1px solid #0062BA',
    marginBottom: '10px',
    background: 'none',
  },
  searchBoxInput: {
    fontSize: '14px',
    color: '#6A6A6A',
    padding: '6px',
  },
  searchBoxIcon: {
    color: '#000000',
  },
  collapsableContainer: {
    paddingRight: '2px',
    paddingLeft: '2px',
  },
});

const mapsStateToProps = (
  state: IAppState,
  props: IToolbarProvidedProps,
): IToolbarProps => {
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  return {
    classes: props.classes,
    dataModel: state.appData.dataModel.model,
    textResources: state.appData.textResources.resources,
    thirdPartyComponents: state.thirdPartyComponents.components,
    activeContainer: state.formDesigner.layout.activeContainer,
    activeList: state.formDesigner.layout.activeList,
    order: GetLayoutOrderSelector(state),
    language: state.appData.language.language,
  };
};

export const Toolbar = withStyles(styles, { withTheme: true })(connect(mapsStateToProps)(ToolbarClass));
