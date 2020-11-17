/* eslint-disable import/no-cycle */
import { Collapse, createStyles, Theme, withStyles } from '@material-ui/core';
import List from '@material-ui/core/List';
import * as React from 'react';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import { getLanguageFromKey } from 'app-shared/utils/language';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { advancedComponents, ComponentTypes, IComponent, schemaComponents, textComponents } from '../components';
import { EditModalContent } from '../components/config/EditModalContent';
import { CollapsableMenuComponent } from '../components/toolbar/CollapsableMenuComponent';
import { InformationPanelComponent } from '../components/toolbar/InformationPanelComponent';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { getComponentTitleByComponentType } from '../utils/language';
import { ToolbarItem } from './ToolbarItem';

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
  advancedComponentListOpen: boolean;
  advancedComponentListCloseAnimationDone: boolean;
}
class ToolbarClass extends React.Component<IToolbarProps, IToolbarState> {
  public components: IToolbarElement[];

  public textComponents: IToolbarElement[];

  public advancedComponents: IToolbarElement[];

  constructor(props: IToolbarProps, state: IToolbarState) {
    super(props, state);
    this.state = {
      modalOpen: false,
      selectedComp: {},
      selectedCompId: '',
      componentInformationPanelOpen: false,
      componentSelectedForInformationPanel: null,
      anchorElement: null,
      componentListOpen: true,
      componentListCloseAnimationDone: false,
      textListOpen: false,
      textListCloseAnimationDone: false,
      advancedComponentListOpen: false,
      advancedComponentListCloseAnimationDone: false,
    };
    this.components = schemaComponents.map(this.mapComponentToToolbarElement);
    this.textComponents = textComponents.map(this.mapComponentToToolbarElement);
    this.advancedComponents = advancedComponents.map(this.mapComponentToToolbarElement);
  }

  public mapComponentToToolbarElement = (c: IComponent): IToolbarElement => {
    const customProperties = c.customProperties ? c.customProperties : {};
    return {
      label: c.name,
      icon: c.Icon,
      type: c.name,
      actionMethod: (c.name === ComponentTypes.Group) ? this.addContainerToLayout :
        (containerId: string, position: number) => {
          FormDesignerActionDispatchers.addFormComponent({
            type: c.name,
            itemType: LayoutItemType.Component,
            textResourceBindings: {
              title: c.name === 'Button' ?
                getLanguageFromKey('ux_editor.modal_properties_button_type_submit', this.props.language)
                : getComponentTitleByComponentType(c.name, this.props.language),
            },
            dataModelBindings: {},
            ...JSON.parse(JSON.stringify(customProperties)),
          },
          position,
          containerId);
          this.updateActiveListOrder();
        },
    } as IToolbarElement;
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

  public handleNext = (component: any, id: string) => {
    this.setState({
      selectedComp: component,
      selectedCompId: id,
      modalOpen: true,
    });
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
      componentSelectedForInformationPanel: null,
      anchorElement: null,
    });
  }

  public handleCollapsableListClicked = (menu: CollapsableMenus) => {
    if (menu === CollapsableMenus.Components) {
      this.setState((prevState) => ({
        componentListOpen: !prevState.componentListOpen,
      }));
    } else if (menu === CollapsableMenus.Texts) {
      this.setState((prevState) => ({
        textListOpen: !prevState.textListOpen,
      }));
    } else if (menu === CollapsableMenus.AdvancedComponents) {
      this.setState((prevState) => ({
        advancedComponentListOpen: !prevState.advancedComponentListOpen,
      }));
    }
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
    } else if (list === 'advancedComponent') {
      this.setState({
        advancedComponentListCloseAnimationDone: done,
      });
    }
  }

  public addContainerToLayout = (containerId: string, index: number) => {
    FormDesignerActionDispatchers.addFormContainer(
      {
        maxCount: 0,
        dataModelBindings: {},
        itemType: 'CONTAINER',
      } as ICreateFormContainer,
      containerId,
      null,
      null,
      index,
    );
  }

  public updateActiveListOrder() {
    FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order);
  }

  public render() {
    return (
      <div className='col-sm-12'>
        {/* <FormControl
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
                  <i className={'fa fa-search'} />
                </InputAdornment>,
              classes: { root: classNames(this.props.classes.searchBoxInput) },
            }}
          />
        </FormControl> */}
        <List
          id='collapsable-items'
          tabIndex={-1}
          component='div'
        >

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
              component='div'
            >
              {this.components.map((component: IToolbarElement) => (
                <ToolbarItem
                  text={getComponentTitleByComponentType(component.type, this.props.language)
                    || component.label}
                  icon={component.icon}
                  componentType={component.type}
                  onDropAction={component.actionMethod}
                  onClick={this.handleComponentInformationOpen}
                  key={component.type}
                />
              ))
              }
              {/*

              Commented out since we're disabling containers until design is done.
              https://github.com/Altinn/altinn-studio/issues/451
              <ToolbarItem
                text={this.props.language.ux_editor.container}
                onClick={this.handleComponentInformationOpen}
                onDropAction={this.addContainerToLayout}
                componentType={ComponentTypes.Container}
              />
              */}
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
            <List
              dense={false}
              id='schema-texts'
              component='div'
            >
              {this.textComponents.map((component: IToolbarElement) => (
                <ToolbarItem
                  text={getComponentTitleByComponentType(component.type, this.props.language)
                    || component.label}
                  icon={component.icon}
                  componentType={component.type}
                  onClick={this.handleComponentInformationOpen}
                  onDropAction={component.actionMethod}
                  key={component.type}
                />
              ))}
            </List>
          </Collapse>
          <CollapsableMenuComponent
            menuIsOpen={this.state.advancedComponentListOpen}
            onClick={this.handleCollapsableListClicked}
            menuType={CollapsableMenus.AdvancedComponents}
          />
          <Collapse
            in={this.state.advancedComponentListOpen}
            onExited={this.setCollapsableListAnimationState.bind(this, 'advancedComponent', true)}
            onEnter={this.setCollapsableListAnimationState.bind(this, 'advancedComponent', false)}
            style={this.state.advancedComponentListCloseAnimationDone ? { display: 'none' } : {}}
            classes={{
              container: this.props.classes.collapsableContainer,
            }}
          >
            <List
              dense={false}
              id='advanced-components'
              component='div'
            >
              {this.advancedComponents.map((component: IToolbarElement) => (
                <ToolbarItem
                  text={getComponentTitleByComponentType(component.type, this.props.language)
                    || component.label}
                  icon={component.icon}
                  componentType={component.type}
                  onClick={this.handleComponentInformationOpen}
                  onDropAction={component.actionMethod}
                  key={component.type}
                />
              ))}
            </List>
          </Collapse>
        </List >

        <Modal
          isOpen={this.state.modalOpen}
          onRequestClose={this.handleCloseModal}
          ariaHideApp={false}
          contentLabel='Input edit'
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
