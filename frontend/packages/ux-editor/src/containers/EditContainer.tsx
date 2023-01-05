import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EditModalContent } from '../components/config/EditModalContent';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import '../styles/index.css';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import { componentIcons } from '../components';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { FormComponentType, IAppState, IFormComponent } from '../types/global';
import classes from './EditContainer.module.css';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { Cancel, Delete, Edit, Success } from '@navikt/ds-icons';
import cn from 'classnames';
import { ConnectDragSource } from 'react-dnd';
import { DragHandle } from '../components/DragHandle';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useText } from '../hooks';
import { textSelector } from '../selectors/textSelectors';
import { textResourcesByLanguageSelector } from '../selectors/textResourceSelectors';

export interface IEditContainerProps {
  component: IFormComponent;
  id: string;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendItemToParent: any;
  singleSelected: boolean;
  partOfGroup?: boolean;
  children: any;
  dragHandleRef: ConnectDragSource;
}

export function EditContainer(props: IEditContainerProps) {
  const dispatch = useDispatch();
  const t = useText();

  const [component, setComponent] = useState<IFormComponent>({
    id: props.id,
    ...props.component,
  });
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [listItem, setListItem] = useState<any>({
    id: props.id,
    firstInActiveList: props.firstInActiveList,
    lastInActiveList: props.lastInActiveList,
    inEditMode: false,
    order: null,
  });

  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const activeList = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const language = useSelector(textSelector);
  const orderList = useSelector((state: IAppState) => GetLayoutOrderSelector(state));
  const textResources = useSelector(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));

  const handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    setComponent({ ...updatedComponent });
  };

  const handleComponentDelete = (e: any): void => {
    if (activeList.length > 1) {
      dispatch(FormLayoutActions.deleteFormComponents({ components: activeList }));
    } else {
      dispatch(FormLayoutActions.deleteFormComponents({ components: [props.id] }));
    }
    dispatch(FormLayoutActions.deleteActiveList());
    e.stopPropagation();
  };

  const handleOpenEdit = (): void => {
    setIsEditMode(true);
    const newListItem = { ...listItem, inEditMode: true };
    setListItem(newListItem);
    props.sendItemToParent(listItem);
  };

  const handleSetActive = (): void => {
    if (!isEditMode) {
      const key: any = Object.keys(orderList)[0];
      const orderIndex = orderList[key].indexOf(listItem.id);
      const newListItem = { ...listItem, order: orderIndex };
      setListItem(newListItem);
      props.sendItemToParent(newListItem);
    }
  };

  const handleSave = (): void => {
    const newListItem = { ...listItem, inEditMode: false };
    setListItem(newListItem);
    setIsEditMode(false);

    if (JSON.stringify(component) !== JSON.stringify(props.component)) {
      handleSaveChange(component);
      if (props.id !== component.id) {
        dispatch(
          FormLayoutActions.updateFormComponentId({
            newId: component.id,
            currentId: props.id,
          })
        );
      }
    }

    props.sendItemToParent(newListItem);
    dispatch(FormLayoutActions.deleteActiveList());
  };

  const handleDiscard = (): void => {
    setComponent({ ...props.component });
    setIsEditMode(false);
    dispatch(FormLayoutActions.deleteActiveList());
  };

  const handleSaveChange = (callbackComponent: FormComponentType): void => {
    dispatch(
      FormLayoutActions.updateFormComponent({
        id: props.id,
        updatedComponent: callbackComponent,
      })
    );
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleSetActive();
    }
  };

  const activeListIndex = activeList.findIndex((item: any) => item.id === props.id);
  return (
    <div className={cn(classes.wrapper, isEditMode && classes.editMode)}>
      <div className={classes.formComponentWithHandle}>
        <div ref={props.dragHandleRef} className={classes.dragHandle}>
          <DragHandle/>
        </div>
        <div
          className={classes.formComponent}
          onClick={handleSetActive}
          onKeyDown={handleKeyPress}
          tabIndex={0}
        >
          {isEditMode && component ? (
            <EditModalContent
              component={JSON.parse(JSON.stringify(component))}
              handleComponentUpdate={handleComponentUpdate}
            />
          ) : (
            <div className={classes.formComponentTitle}>
              <i className={componentIcons[component.type] || 'fa fa-help-circle'}/>
              {component.textResourceBindings?.title
                ? truncate(
                  getTextResource(component.textResourceBindings.title, textResources),
                  80
                )
                : getComponentTitleByComponentType(component.type, language) ||
                t('ux_editor.component_unknown')}
            </div>
          )}
        </div>
      </div>
      {!isEditMode && (
        <div className={classes.buttons}>
          {(activeListIndex === 0 || activeList.length < 1) && (
            <Button
              color={ButtonColor.Secondary}
              icon={<Delete/>}
              onClick={handleComponentDelete}
              tabIndex={0}
              variant={ButtonVariant.Quiet}
            />
          )}
          {(activeList.length < 1 ||
            (activeList.length === 1 && activeListIndex === 0)) && (
            <Button
              color={ButtonColor.Secondary}
              data-testid='EditContainer-edit-button'
              icon={<Edit/>}
              onClick={handleOpenEdit}
              tabIndex={0}
              variant={ButtonVariant.Quiet}
            />
          )}
        </div>
      )}
      {isEditMode && (
        <div className={classes.buttons}>
          <Button
            color={ButtonColor.Secondary}
            icon={<Cancel/>}
            onClick={handleDiscard}
            tabIndex={0}
            variant={ButtonVariant.Quiet}
          />
          <Button
            color={ButtonColor.Secondary}
            icon={<Success/>}
            onClick={handleSave}
            tabIndex={0}
            variant={ButtonVariant.Quiet}
          />
        </div>
      )}
    </div>
  );
}
