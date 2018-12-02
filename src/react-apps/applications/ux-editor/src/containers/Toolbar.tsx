import { Collapse, createStyles, ListItemText, Theme, withStyles } from '@material-ui/core';
import { ListItem, ListItemIcon, Paper } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import InputAdornment from '@material-ui/core/InputAdornment';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import { ExpandLess, ExpandMore, HelpOutline } from '@material-ui/icons';
import classNames = require('classnames');
import * as React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import * as Modal from 'react-modal';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import components from '../components';
import { EditModalContent } from '../components/config/EditModalContent';
import { ConditionalRenderingModalComponent } from '../components/toolbar/ConditionalRenderingModal';
import { ExternalApiModalComponent } from '../components/toolbar/ExternalApiModal';
import { InformationPanelComponent } from '../components/toolbar/InformationPanelComponent';
import { ListSelectorComponent } from '../components/toolbar/ListSelectorComponent';
import { RuleModalComponent } from '../components/toolbar/RuleModalComponent';
import '../styles/toolBar.css';

const THIRD_PARTY_COMPONENT: string = 'ThirdParty';

export interface IToolbarElement {
  label: string;
  actionMethod: () => void;
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
  language: any;
}
export interface IToolbarState {
  modalOpen: boolean;
  selectedComp: any;
  selectedCompId: string;
  componentInformationPanelOpen: boolean;
  componentSelectedForInformationPanel: string;
  anchorElement: any;
  componentListOpen: boolean;
  textListOpen: boolean;
}
class ToolbarClass extends React.Component<IToolbarProps, IToolbarState> {
  public toolbarComponents: IToolbarElement[] = components.map((c: any) => {
    const customProperties = c.customProperties ? c.customProperties : {};
    return {
      label: c.name,
      actionMethod: () => {
        FormDesignerActionDispatchers.addFormComponent({
          component: c.name,
          itemType: LayoutItemType.Component,
          title: c.name,
          ...JSON.parse(JSON.stringify(customProperties)),
        },
          null,
        );
      },
    } as IToolbarElement;
  });

  constructor(props: IToolbarProps, state: IToolbarState) {
    super(props, state);
    this.state = {
      modalOpen: false,
      selectedComp: {},
      selectedCompId: '',
      componentInformationPanelOpen: false,
      componentSelectedForInformationPanel: '',
      anchorElement: null,
      componentListOpen: true,
      textListOpen: true,
    };
  }

  public addContainerToLayout(activeContainer: string) {
    FormDesignerActionDispatchers.addFormContainer({
      repeating: false,
      dataModelGroup: null,
      index: 0,

    } as ICreateFormContainer,
      null,
      activeContainer,
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

  public onDragEnd = () => {
    // Do Nothing
  }

  public setToolbarLabel = (label: any) => {
    if (this.props.language) {
      if (label === 'Header') {
        label = this.props.language.ux_editor.toolbar_header;
      } else if (label === 'FileUpload') {
        label = this.props.language.ux_editor.toolbar_file_upload;
      }
    }
    return label;
  }

  public renderToolbarItem = (componentLabel: string): JSX.Element => {
    return (
      <Paper square={true} classes={{ root: classNames(this.props.classes.paper) }}>
        <ListItem classes={{ root: classNames(this.props.classes.listItem) }}>
          <ListItemText classes={{ primary: classNames(this.props.classes.listItemText) }}>
            {componentLabel}
          </ListItemText>
          <ListItemIcon classes={{ root: classNames(this.props.classes.listItemIcon) }}>
            <HelpOutline
              classes={{ root: classNames(this.props.classes.helpOutline) }}
              onClick={this.handleComponentInformationOpen.bind(this, componentLabel)}
            />
          </ListItemIcon>
        </ListItem>
      </Paper>
    );
  }

  public renderCollapsableMenuItem = (menu: CollapsableMenus): JSX.Element => {
    return (
      <ListItem
        classes={{ root: this.props.classes.collapsableButton }}
        onClick={this.handleCollapsableListClicked.bind(this, menu)}
      >
        <ListItemIcon
          classes={{ root: this.props.classes.listItemIcon }}
        >
          {
            (menu === CollapsableMenus.Components) ?
              (this.state.componentListOpen ? <ExpandLess /> : <ExpandMore />) :
              (this.state.textListOpen ? <ExpandLess /> : <ExpandMore />)
          }
        </ListItemIcon>
        <ListItemText
          classes={{
            root: classNames(this.props.classes.collapsableButtonTextRoot),
            primary: classNames(this.props.classes.collapsableButtonText),
          }}
        >
          {(menu === CollapsableMenus.Components) ? 'Skjemakomponenter' : 'Tekster'}
        </ListItemText>
      </ListItem>
    );
  }

  public handleComponentInformationOpen = (componentName: string, event: any) => {
    this.setState({
      componentInformationPanelOpen: true,
      componentSelectedForInformationPanel: componentName,
      anchorElement: event.currentTarget,
    });
  }

  public handleComponentInformationClose = () => {
    this.setState({
      componentInformationPanelOpen: false,
      componentSelectedForInformationPanel: '',
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

  public render() {
    return (
      <div className={'col-sm-12'}>
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

        <ListSelectorComponent onChange={{}} />

        <List id='collapsable-items'>
          {this.renderCollapsableMenuItem(CollapsableMenus.Components)}

          <Collapse in={this.state.componentListOpen}>
            <List dense={false} id='schema-components'>
              <Droppable droppableId='ITEMS' isDropDisabled={true}>
                {(provided: any, snapshot: any) => (
                  <div ref={provided.innerRef}>
                    {this.toolbarComponents.map((component, index) => {
                      return (
                        <Draggable
                          key={index}
                          draggableId={index.toString()}
                          index={index}
                        >
                          {
                            /*tslint:disable-next-line:no-shadowed-variable */
                            (provided: any, snapshot: any) => (
                              <div
                                style={''}
                                id={index.toString()}
                                key={index}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                {this.renderToolbarItem(component.label)}
                              </div>

                            )}
                        </Draggable>
                      );
                    })}

                    {this.getThirdPartyComponents().map((component, index) => (
                      <Draggable
                        key={index}
                        draggableId={component.label}
                        index={5}
                      >
                        {
                          /*tslint:disable-next-line:no-shadowed-variable */
                          (provided: any, snapshot: any) => (
                            <div
                              style={''}
                              id={index.toString()}
                              key={index}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              {this.renderToolbarItem(component.label)}
                            </div>
                          )}
                      </Draggable>
                    ))}

                    <Draggable
                      key={'add container'}
                      draggableId={'container'}
                      index={6}
                    >
                      {
                        /*tslint:disable-next-line:no-shadowed-variable */
                        (provided: any, snapshot: any) => (
                          <div
                            style={''}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {this.renderToolbarItem(this.props.language.ux_editor.toolbar_add_container)}
                          </div>
                        )
                      }
                    </Draggable>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </List>
          </Collapse>
          {this.renderCollapsableMenuItem(CollapsableMenus.Texts)}
          <Collapse in={this.state.textListOpen}>
            <List dense={false} id={'schema-texts'}>
              {this.renderToolbarItem('Header')}
            </List>
          </Collapse>
        </List>

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
    marginTop: '10px',
    marginBottom: '24px',
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
  listItemText: {
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listItem: {
    paddingLeft: '12px',
    paddingRight: '8px',
    paddingTop: '9px',
    paddingBottom: '8px',
  },
  paper: {
    marginBottom: '6px',
  },
  helpOutline: {
    width: '24px', // 24px on wrapper makes the svg icon scale to 20*20pixels
    height: '24px',
  },
  listItemIcon: {
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  collapsableButtonText: {
    fontSize: '14px',
    marginLeft: '6px',
    padding: '0px',
  },
  collapsableButtonTextRoot: {
    padding: '0px',
  },
  collapsableButton: {
    padding: '0px',
  },
});

const mapsStateToProps = (
  state: IAppState,
  props: IToolbarProvidedProps,
): IToolbarProps => {
  return {
    classes: props.classes,
    dataModel: state.appData.dataModel.model,
    textResources: state.appData.textResources.resources,
    thirdPartyComponents: state.thirdPartyComponents.components,
    activeContainer: state.formDesigner.layout.activeContainer,
    language: state.appData.language.language,
  };
};

export const Toolbar = withStyles(styles, { withTheme: true })(connect(mapsStateToProps)(ToolbarClass));
