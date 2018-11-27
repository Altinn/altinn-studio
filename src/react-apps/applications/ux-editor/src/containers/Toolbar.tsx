import { createStyles, Theme, withStyles } from '@material-ui/core';
import { ListItem, ListItemIcon, ListItemSecondaryAction, Paper } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import InputAdornment from '@material-ui/core/InputAdornment';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';
import { HelpOutline } from '@material-ui/icons';
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
}

const styles = (theme: Theme) => createStyles({
  searchBox: {
    border: '1px solid #0062BA',
    marginTop: '10px',
    marginBottom: '24px',
    background: 'none',
  },
  searchBoxInput: {
    fontSize: '1.4rem',
    color: '#6A6A6A',
    padding: '6px',
  },
  searchBoxIcon: {
    color: '#000000',
  },
});

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

  public handleOnMoreInfoClick = (event: any) => {
    console.log('WAS CLICKED');
    console.log(event);
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
              endAdornment: <InputAdornment position={'end'} classes={{ root: classNames(this.props.classes.searchBoxIcon) }}>
                <i className={'ai ai-search'} />
              </InputAdornment>,
              classes: { root: classNames(this.props.classes.searchBoxInput) },
            }}
          />
        </FormControl>


        <List dense={false}>
          <Paper>
            <ListItem>
              {'Component'}
              <ListItemIcon>
                <HelpOutline
                  onClick={this.handleOnMoreInfoClick}
                />
              </ListItemIcon>
            </ListItem>
          </Paper>
        </List>

        <Droppable droppableId='ITEMS' isDropDisabled={true}>

          {(provided: any, snapshot: any) => (
            <div className='row' ref={provided.innerRef}>
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
                        <React.Fragment>
                          <div
                            className='col col-lg-12 a-item'
                            id={index.toString()}
                            key={index}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {component.label}
                          </div>
                        </React.Fragment>
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
                      <>
                        <div>
                          <div
                            className='col col-lg-12 a-item'
                            id={index.toString()}
                            key={index}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {component.label}
                          </div>

                          {snapshot.isDragging && (
                            <div className='col col-lg-12 a-item'>
                              {component.label}
                            </div>
                          )}
                        </div>
                      </>
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
                    <>
                      <div
                        className='col col-lg-12 a-item'
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        Add container
                      </div>
                      {snapshot.isDragging && (
                        <div className='col col-lg-12 a-item'>
                          Add container
                        </div>
                      )}
                    </>
                  )
                }
              </Draggable>
              {provided.placeholder}
            </div>
          )}
        </Droppable>

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
      </div >
    );
  }

}

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
