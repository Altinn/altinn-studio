import type { RefObject } from 'react';
import React, { Component, createRef } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';
import '../styles/index.css';
import { getLanguageFromKey } from 'app-shared/utils/language';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import {
  makeGetActiveFormContainer,
  makeGetLayoutComponentsSelector,
  makeGetLayoutContainerOrder,
  makeGetLayoutContainersSelector,
} from '../selectors/getLayoutData';
import {
  renderOptionalSelectTextFromResources,
  renderSelectGroupDataModelBinding,
} from '../utils/render';
import { FormComponentWrapper } from '../components/FormComponent';
import { getTextResource } from '../utils/language';
import { idExists, validComponentId } from '../utils/formLayout';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type {
  IAppState,
  ICreateFormContainer,
  IDataModelFieldElement,
  IFormDesignerComponents,
  IFormLayoutOrder,
  ITextResource,
} from '../types/global';
import { DroppableDraggableComponent } from './DroppableDraggableComponent';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import type { EditorDndEvents } from './helpers/dnd-types';
import {
  Button,
  ButtonColor,
  ButtonVariant,
  Checkbox,
  CheckboxGroup,
  FieldSet,
  TextField,
} from '@altinn/altinn-design-system';
import classes from './Container.module.css';
import cn from 'classnames';
import { Collapse, Delete, Edit, Error, Expand, Success } from '@navikt/ds-icons';

export interface IProvidedContainerProps {
  isBaseContainer?: boolean;
  dispatch?: Dispatch;
  id: string;
  index?: number;
  items?: string[];
  layoutOrder?: IFormLayoutOrder;
  dndEvents: EditorDndEvents;
  sendListToParent?: (item: object) => void;
}

export interface IContainerProps extends IProvidedContainerProps {
  dataModelGroup?: string;
  itemOrder: any;
  components: IFormDesignerComponents;
  containers: any;
  repeating: boolean;
  index?: number;
  formContainerActive?: boolean;
  activeList: any[];
  language: any;
  dataModel: IDataModelFieldElement[];
  textResources: ITextResource[];
}

export interface IContainerState {
  itemOrder: any;
  currentlyDragging: boolean;
  activeList: any[];
  editMode: boolean;
  tmpContainer: ICreateFormContainer;
  tmpId: string;
  expanded: boolean;
  groupIdError: string;
  groupIdPopoverRef: RefObject<HTMLDivElement>;
  tableHeadersError: string;
  tableHeadersPopoverRef: RefObject<HTMLDivElement>;
}

export class ContainerComponent extends Component<IContainerProps, IContainerState> {
  public static getDerivedStateFromProps(nextProps: IContainerProps, prevState: IContainerState) {
    if (prevState.currentlyDragging) {
      return {
        ...prevState,
      };
    }
    return {
      ...nextProps,
    };
  }

  constructor(_props: IContainerProps) {
    super(_props);

    this.state = {
      itemOrder: _props.itemOrder,
      currentlyDragging: false,
      activeList: [],
      editMode: false,
      tmpContainer: JSON.parse(
        JSON.stringify(this.props.containers[this.props.id])
      ) as unknown as ICreateFormContainer,
      tmpId: this.props.id,
      expanded: true,
      groupIdError: null,
      groupIdPopoverRef: createRef<HTMLDivElement>(),
      tableHeadersError: null,
      tableHeadersPopoverRef: createRef<HTMLDivElement>(),
    };
  }

  public handleChangeRepeatingGroup = () => {
    this.setState((prevState: IContainerState) => {
      const tmpContainer = prevState.tmpContainer;
      const isRepeating = tmpContainer.maxCount > 0;
      if (isRepeating) {
        // we are disabling the repeating feature, remove datamodelbinding
        tmpContainer.dataModelBindings.group = undefined;
        tmpContainer.maxCount = undefined;
        tmpContainer.textResourceBindings = undefined;
      } else {
        tmpContainer.maxCount = 2;
      }
      return {
        tmpContainer,
      };
    });
  };

  public handleMaxOccurChange = (event: any) => {
    let maxOcc = event.target?.value;
    if (maxOcc < 2) {
      maxOcc = 2;
    }
    this.setState((prevState: IContainerState) => {
      return {
        tmpContainer: {
          ...prevState.tmpContainer,
          maxCount: maxOcc,
        },
      };
    });
  };

  public handleContainerDelete = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    const { dispatch } = this.props;
    event.stopPropagation();
    dispatch(
      FormLayoutActions.deleteFormContainer({
        id: this.props.id,
        index: this.props.index,
      })
    );
  };

  public handleDiscard = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    const { dispatch } = this.props;
    dispatch(FormLayoutActions.deleteActiveList());
    this.setState({
      editMode: false,
      tmpContainer: JSON.parse(
        JSON.stringify(this.props.containers[this.props.id])
      ) as unknown as ICreateFormContainer,
      tmpId: this.props.id,
    });
  };

  public handleSave = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    const { dispatch } = this.props;
    if (this.state.tmpId && this.state.tmpId !== this.props.id) {
      if (idExists(this.state.tmpId, this.props.components, this.props.containers)) {
        this.setState(() => ({
          groupIdError: getLanguageFromKey(
            'ux_editor.modal_properties_group_id_not_unique_error',
            this.props.language
          ),
        }));
      } else if (!validComponentId.test(this.state.tmpId)) {
        this.setState(() => ({
          groupIdError: getLanguageFromKey(
            'ux_editor.modal_properties_group_id_not_valid',
            this.props.language
          ),
        }));
      } else {
        dispatch(
          FormLayoutActions.updateFormContainer({
            updatedContainer: this.state.tmpContainer,
            id: this.props.id,
          })
        );
        dispatch(FormLayoutActions.deleteActiveList());
        dispatch(
          FormLayoutActions.updateContainerId({
            currentId: this.props.id,
            newId: this.state.tmpId,
          })
        );
        this.setState({
          editMode: false,
        });
      }
    } else if (this.state.tmpContainer.tableHeaders?.length === 0) {
      this.setState({
        tableHeadersError: getLanguageFromKey(
          'ux_editor.modal_properties_group_table_headers_error',
          this.props.language
        ),
      });
    } else {
      // No validations, save.
      dispatch(
        FormLayoutActions.updateFormContainer({
          updatedContainer: this.state.tmpContainer,
          id: this.props.id,
        })
      );
      dispatch(FormLayoutActions.deleteActiveList());
      this.setState({
        editMode: false,
      });
    }
  };

  public handleNewId = (event: any) => {
    if (
      idExists(event.target.value, this.props.components, this.props.containers) &&
      event.target.value !== this.props.id
    ) {
      this.setState(() => ({
        groupIdError: getLanguageFromKey(
          'ux_editor.modal_properties_group_id_not_unique_error',
          this.props.language
        ),
      }));
    } else if (!validComponentId.test(event.target.value)) {
      this.setState(() => ({
        groupIdError: getLanguageFromKey(
          'ux_editor.modal_properties_group_id_not_valid',
          this.props.language
        ),
      }));
    } else {
      this.setState({
        groupIdError: null,
      });
    }
  };

  public handleClosePopup = () => {
    this.setState({
      groupIdError: null,
      tableHeadersError: null,
    });
  };

  public handleButtonTextChange = (e: any) => {
    this.setState((prevState: IContainerState) => {
      const updatedContainer = prevState.tmpContainer;
      if (!updatedContainer.textResourceBindings) {
        updatedContainer.textResourceBindings = {};
      }
      updatedContainer.textResourceBindings.add_button = e ? e.value : null;
      return {
        tmpContainer: updatedContainer,
      };
    });
  };

  public handleTableHeadersChange = (ids: string[]) => {
    this.setState((prevState: IContainerState) => {
      const updatedContainer = prevState.tmpContainer;
      updatedContainer.tableHeaders = [...ids];
      if (updatedContainer.tableHeaders?.length === this.props.itemOrder.length) {
        // table headers is the same as children. We ignore the table header prop
        updatedContainer.tableHeaders = undefined;
      }
      let errorMessage;
      if (updatedContainer.tableHeaders?.length === 0) {
        errorMessage = getLanguageFromKey(
          'ux_editor.modal_properties_group_table_headers_error',
          this.props.language
        );
      }
      return {
        tmpContainer: updatedContainer,
        tableHeadersError: errorMessage,
      };
    });
  };

  public getMaxOccursForGroupFromDataModel = (dataBindingName: string): number => {
    const element: IDataModelFieldElement = this.props.dataModel.find(
      (e: IDataModelFieldElement) => {
        return e.dataBindingName === dataBindingName;
      }
    );
    return element?.maxOccurs;
  };

  public handleDataModelGroupChange = (dataBindingName: string, key: string) => {
    const maxOccurs = this.getMaxOccursForGroupFromDataModel(dataBindingName);
    this.setState((prevState: IContainerState) => {
      return {
        tmpContainer: {
          ...prevState.tmpContainer,
          dataModelBindings: {
            [key]: dataBindingName,
          },
          maxCount: maxOccurs,
        },
      };
    });
  };

  public handleIdChange = (event: any) => {
    this.setState({
      tmpId: event.target.value,
    });
  };

  public handleExpand = () => {
    this.setState((prevState: IContainerState) => {
      return {
        expanded: !prevState.expanded,
      };
    });
  };

  public handleEditMode = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    const { dispatch } = this.props;
    this.setState((prevState: IContainerState) => {
      const isEdit = !prevState.editMode;
      if (isEdit) {
        const activeObject = {
          firstInActiveList: false,
          id: this.props.id,
          inEditMode: true,
          lastInActiveList: true,
          order: this.props.index,
        };
        this.props.sendListToParent([activeObject]);
        dispatch(
          FormLayoutActions.updateActiveList({
            containerList: this.props.activeList,
            listItem: activeObject,
          })
        );
      }
      return {
        editMode: isEdit,
      };
    });
  };

  public render = (ref?: any): JSX.Element => {
    const { components, containers, id, isBaseContainer, itemOrder } = this.props;
    const { editMode, expanded } = this.state;

    if (editMode) return this.renderEditMode();

    return (
      <div
        onClick={this.changeActiveFormContainer}
        ref={ref}
        className={cn(classes.wrapper, !isBaseContainer && classes.formGroupWrapper)}
      >
        {!isBaseContainer && (
          <div className={classes.formGroup}>
            <div className={classes.formGroupBar}>
              <Button
                color={ButtonColor.Secondary}
                icon={expanded ? <Collapse/> : <Expand/>}
                onClick={this.handleExpand}
                variant={ButtonVariant.Quiet}
              />
              Gruppe - ${id}
            </div>
            <div className={classes.containerEdit}>{this.renderHoverIcons()}</div>
          </div>
        )}
        {!itemOrder?.length && this.renderContainerPlaceholder()}
        {expanded &&
          itemOrder?.length > 0 &&
          itemOrder.map((id: string, index: number) => {
            const component = components[id];
            if (component) {
              return this.renderFormComponent(id, index);
            }
            return containers[id] && this.renderContainer(id, index);
          })}
      </div>
    );
  };

  public renderEditSection = (): JSX.Element => {
    const { components, itemOrder, language, textResources } = this.props;
    const { groupIdError, groupIdPopoverRef, tableHeadersError, tmpContainer, tmpId } = this.state;
    const t = (key: string) => getLanguageFromKey(key, language);
    return (
      <FieldSet className={classes.fieldset}>
        <div>
          <TextField
            id='group-id'
            label={t('ux_editor.modal_properties_group_change_id')}
            onBlur={this.handleNewId}
            onChange={this.handleIdChange}
            value={tmpId}
          />
          <div ref={groupIdPopoverRef} />
          <ErrorPopover
            anchorEl={groupIdError ? groupIdPopoverRef.current : null}
            onClose={this.handleClosePopup}
            errorMessage={groupIdError}
          />
        </div>
        <Checkbox
          checked={tmpContainer.maxCount > 1}
          label={t('ux_editor.modal_properties_group_repeating')}
          onChange={this.handleChangeRepeatingGroup}
        />
        {tmpContainer.maxCount > 1 && (
          <>
            {renderSelectGroupDataModelBinding(
              tmpContainer.dataModelBindings,
              this.handleDataModelGroupChange,
              language,
              'group'
            )}
            <div>
              <TextField
                disabled={!!tmpContainer.dataModelBindings.group}
                formatting={{ number: {} }}
                id='modal-properties-maximum-files'
                label={t('ux_editor.modal_properties_group_max_occur')}
                onChange={this.handleMaxOccurChange}
                value={tmpContainer.maxCount.toString()}
              />
            </div>
            {renderOptionalSelectTextFromResources(
              'modal_properties_group_add_button',
              this.handleButtonTextChange,
              textResources,
              language,
              tmpContainer.textResourceBindings?.add_button,
              tmpContainer.textResourceBindings?.add_button,
              t('ux_editor.modal_properties_group_add_button_description')
            )}
            {itemOrder.length > 0 && (
              <CheckboxGroup
                error={tableHeadersError}
                items={itemOrder.map((id) => ({
                  label: getTextResource(components[id].textResourceBindings?.title, textResources),
                  name: id,
                  checked:
                    tmpContainer.tableHeaders === undefined ||
                    tmpContainer.tableHeaders.includes(id),
                }))}
                legend={t('ux_editor.modal_properties_group_table_headers')}
                onChange={this.handleTableHeadersChange}
              />
            )}
          </>
        )}
      </FieldSet>
    );
  };

  public renderContainerPlaceholder = () => {
    return (
      <DroppableDraggableComponent
        dndEvents={this.props.dndEvents}
        canDrag={false}
        id='placeholder'
        index={0}
        containerId={this.props.id}
      >
        {this.props.language['ux_editor.container_empty']}
      </DroppableDraggableComponent>
    );
  };

  public renderEditMode = (): JSX.Element => (
    <div>
      <div className={classes.editWrapper}>
        <div className={classes.editSection}>{this.renderEditSection()}</div>
        <div className={classes.containerEdit}>{this.renderEditIcons()}</div>
      </div>
    </div>
  );

  public renderHoverIcons = (): JSX.Element => (
    <>
      <Button
        icon={<Delete/>}
        onClick={this.handleContainerDelete}
        variant={ButtonVariant.Quiet}
      />
      <Button icon={<Edit/>} onClick={this.handleEditMode} variant={ButtonVariant.Quiet} />
    </>
  );

  public renderEditIcons = (): JSX.Element => (
    <>
      <Button icon={<Error/>} onClick={this.handleDiscard} variant={ButtonVariant.Quiet} />
      <Button icon={<Success/>} onClick={this.handleDiscard} variant={ButtonVariant.Quiet} />
    </>
  );

  public renderContainer = (id: string, index: number): JSX.Element => {
    const canDrag = !this.state.activeList.find((element: any) => element.id === id);
    return (
      <DroppableDraggableContainer
        id={id}
        index={index}
        isBaseContainer={false}
        parentContainerId={this.props.id}
        canDrag={canDrag}
        dndEvents={this.props.dndEvents}
        key={id}
      >
        <Container
          id={id}
          key={id}
          index={index}
          items={this.props.layoutOrder[id]}
          isBaseContainer={false}
          layoutOrder={this.props.layoutOrder}
          dndEvents={this.props.dndEvents}
          sendListToParent={this.handleActiveListChange}
        />
      </DroppableDraggableContainer>
    );
  };

  public handleActiveListChange = (list: any[]) => {
    this.setState({
      activeList: list,
    });
  };

  public renderFormComponent = (id: string, index: number): JSX.Element => {
    const activeListIndex = this.props.activeList.findIndex((listItem: any) => listItem.id === id);
    let canDrag = true;
    // eslint-disable-next-line no-restricted-syntax
    for (const activeItem of this.state.activeList) {
      if (activeItem.id === id) {
        canDrag = false;
      }
    }
    const firstInActiveList =
      activeListIndex >= 0 ? this.props.activeList[activeListIndex].firstInActiveList : true;
    const lastInActiveList =
      activeListIndex >= 0 ? this.props.activeList[activeListIndex].lastInActiveList : true;
    return (
      <DroppableDraggableComponent
        canDrag={canDrag}
        containerId={this.props.id}
        dndEvents={this.props.dndEvents}
        id={id}
        index={index}
        key={id}
      >
        <FormComponentWrapper
          activeList={this.props.activeList}
          firstInActiveList={firstInActiveList}
          id={id}
          lastInActiveList={lastInActiveList}
          partOfGroup={!this.props.isBaseContainer}
          sendListToParent={this.handleActiveListChange}
          singleSelected={this.props.activeList.length === 1}
        />
      </DroppableDraggableComponent>
    );
  };

  public changeActiveFormContainer = (e: any) => {
    e.stopPropagation();
  };
}

const makeMapStateToProps = () => {
  const GetLayoutContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutComponentsSelector = makeGetLayoutComponentsSelector();
  const GetActiveFormContainer = makeGetActiveFormContainer();
  const GetContainersSelector = makeGetLayoutContainersSelector();
  const GetLayoutContainerOrder = makeGetLayoutContainerOrder();
  return (state: IAppState, props: IProvidedContainerProps): IContainerProps => {
    const containers = GetContainersSelector(state);
    const container = containers[props.id];
    const itemOrder = GetLayoutContainerOrder(state, props.id);
    return {
      ...props,
      activeList: state.formDesigner.layout.activeList,
      isBaseContainer: props.isBaseContainer,
      components: GetLayoutComponentsSelector(state),
      containers: GetLayoutContainersSelector(state),
      dataModel: state.appData.dataModel.model,
      dataModelGroup: container?.dataModelGroup,
      dispatch: props.dispatch,
      dndEvents: props.dndEvents,
      formContainerActive: GetActiveFormContainer(state, props),
      id: props.id,
      index: props.index,
      itemOrder: !props.items ? itemOrder : props.items,
      language: state.appData.languageState.language,
      repeating: container?.repeating,
      textResources: state.appData.textResources.resources,
    };
  };
};

export const Container = connect(makeMapStateToProps)(ContainerComponent);
