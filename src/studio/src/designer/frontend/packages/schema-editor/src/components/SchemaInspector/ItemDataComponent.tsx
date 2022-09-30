import { TextField as MaterialTextField } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ILanguage, ISchemaState } from '../../types';
import { NameError } from '../../types';
import { getTranslation } from '../../utils/language';
import {
  addCombinationItem,
  deleteCombinationItem,
  navigateToType,
  setCombinationType,
  setDescription,
  setPropertyName,
  setRef,
  setTitle,
  setType,
} from '../../features/editor/schemaEditorSlice';
import { TypeSelect } from './TypeSelect';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { CombinationSelect } from './CombinationSelect';
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import { ErrorMessage, TextField, Checkbox } from '@altinn/altinn-design-system';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import { Divider } from './Divider';
import { Label } from './Label';
import { Fieldset } from './Fieldset';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  combinationIsNullable,
  CombinationKind,
  FieldType,
  getChildNodesByNode,
  getNodeDisplayName,
  Keywords,
  ObjectKind,
} from '@altinn/schema-model';
import { getDomFriendlyID, isValidName } from '../../utils/ui-schema-utils';

export interface IItemDataComponentProps {
  selectedItem: UiSchemaNode;
  language: ILanguage;
  checkIsNameInUse: (name: string) => boolean;
}

export function ItemDataComponent({ language, selectedItem, checkIsNameInUse }: IItemDataComponentProps) {
  const dispatch = useDispatch();
  const selectedNodePointer = selectedItem.pointer;
  const [nameError, setNameError] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [description, setItemDescription] = useState<string>('');
  const [title, setItemTitle] = useState<string>('');
  const [fieldType, setFieldType] = useState<FieldType | CombinationKind | undefined>(undefined);
  const [arrayType, setArrayType] = useState<FieldType | string | undefined>(undefined);

  useEffect(() => {
    setNodeName(getNodeDisplayName(selectedItem));
    setNameError(NameError.NoError);
    setItemTitle(selectedItem.title ?? '');
    setItemDescription(selectedItem.description ?? '');
    setFieldType(selectedItem.fieldType);
  }, [selectedItem]);

  const onNameChange = (e: any) => {
    const name: string = e.target.value;
    setNodeName(name);
    !isValidName(name) ? setNameError(NameError.InvalidCharacter) : setNameError(NameError.NoError);
  };

  const onChangeRef = (path: string, ref: string) => dispatch(setRef({ path, ref }));

  const onChangeType = (pointer: string, type: FieldType) => {
    dispatch(setType({ path: selectedItem.pointer, type }));
    setFieldType(type);
  };
  const childNodes = useSelector((state: ISchemaState) => getChildNodesByNode(state.uiSchema, selectedItem));

  const onChangeNullable = (event: any) => {
    if (event.target.checked) {
      dispatch(addCombinationItem({ path: selectedItem.pointer, props: { fieldType: FieldType.Null } }));
    } else {
      childNodes.forEach((childNode: UiSchemaNode) => {
        if (childNode.fieldType === FieldType.Null) {
          dispatch(deleteCombinationItem({ path: childNode.pointer }));
        }
      });
    }
  };

  const onChangeTitle = () => dispatch(setTitle({ path: selectedNodePointer, title }));

  const onChangeDescription = () => dispatch(setDescription({ path: selectedNodePointer, description }));

  const onGoToDefButtonClick = () => {
    if (selectedItem.ref === undefined) {
      return;
    }
    dispatch(navigateToType({ id: selectedItem.ref }));
  };

  const onChangeArrayType = (pointer: string, fieldType: FieldType) => {
    setArrayType(fieldType ?? '');
    dispatch(setType({ path: [pointer, Keywords.Items].join('/'), type: fieldType }));
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    dispatch(setCombinationType({ path: selectedItem.pointer, type: value }));

  const handleArrayPropertyToggle = (e: any) => {
    if (e.target.checked) {
      const type = selectedItem.objectKind === ObjectKind.Reference ? selectedItem.ref : selectedItem.fieldType;
      // @ts-ignore
      onChangeArrayType(selectedItem.pointer, type);
      onChangeType(selectedItem.pointer, FieldType.Array);
    } else {
      if (selectedItem.objectKind === ObjectKind.Reference) {
        onChangeRef(selectedItem.pointer, arrayType || '');
      } else {
        onChangeType(selectedItem.pointer, arrayType as FieldType);
      }
      // @ts-ignore
      onChangeArrayType(selectedItem.pointer, undefined);
    }
  };

  const handleChangeNodeName = () => {
    if (checkIsNameInUse(nodeName)) {
      setNameError(NameError.AlreadyInUse);
      return;
    }
    const displayName = getNodeDisplayName(selectedItem);
    if (!nameError && displayName !== nodeName) {
      dispatch(
        setPropertyName({
          path: selectedItem.pointer,
          name: nodeName,
          navigate: true,
        }),
      );
    }
  };

  const t = (key: string) => getTranslation(key, language);
  const titleId = getDomFriendlyID(selectedNodePointer ?? '', 'title');
  const descriptionId = getDomFriendlyID(selectedNodePointer ?? '', 'description');
  return (
    <div>
      {!selectedItem.isCombinationItem && (
        <>
          <Label htmlFor='selectedItemName'>{t('name')}</Label>
          <TextField
            aria-describedby='Selected Item Name'
            id='selectedItemName'
            onBlur={handleChangeNodeName}
            onChange={onNameChange}
            placeholder='Name'
            value={nodeName}
            aria-errormessage={t(nameError)}
            aria-placeholder='Name'
          />
          {nameError && <ErrorMessage>{t(nameError)}</ErrorMessage>}
        </>
      )}
      {selectedItem.objectKind === ObjectKind.Field && (
        <TypeSelect
          id={getDomFriendlyID(selectedItem.pointer, 'type-select')}
          label={t('type')}
          onChange={(fieldType) => {
            selectedItem.fieldType === FieldType.Array
              ? onChangeArrayType(selectedItem.pointer, fieldType)
              : onChangeType(selectedItem.pointer, fieldType);
          }}
          options={getTypeOptions(t)}
          value={selectedItem.fieldType === FieldType.Array ? arrayType : fieldType}
        />
      )}
      <ReferenceSelectionComponent
        arrayType={arrayType}
        buttonText={t('go_to_type')}
        classes={classes}
        label={t('reference_to')}
        objectKind={selectedItem.objectKind}
        onChangeArrayType={(type) => onChangeArrayType(selectedItem.pointer, type as FieldType)}
        onChangeRef={(refPointer) => onChangeRef(selectedItem.pointer, refPointer)}
        onGoToDefButtonClick={onGoToDefButtonClick}
        selectedItem={selectedItem}
      />
      {[ObjectKind.Reference, ObjectKind.Field].includes(selectedItem.objectKind) && (
        <div className={classes.checkboxWrapper}>
          <Checkbox
            checked={selectedItem?.fieldType === FieldType.Array}
            label={t('multiple_answers') + ' (skrudd av)'}
            name='checkedMultipleAnswers'
            onChange={handleArrayPropertyToggle}
          />
        </div>
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <CombinationSelect
          id={`${getDomFriendlyID(selectedItem.pointer)}-combi-sel`}
          label={t('type')}
          onChange={onChangeCombinationType}
          options={getCombinationOptions(t)}
          value={selectedItem.fieldType}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <div className={classes.checkboxWrapper}>
          <Checkbox
            checked={combinationIsNullable(childNodes)}
            onChange={onChangeNullable}
            name='checkedNullable'
            checkboxId='multiple-answers-checkbox'
            label={t('nullable')}
          />
        </div>
      )}
      <ItemRestrictions item={selectedItem} language={language} />
      <Divider />
      <Fieldset legend={t('descriptive_fields')}>
        <Label htmlFor={titleId}>{t('title')}</Label>
        <TextField id={titleId} onBlur={onChangeTitle} onChange={(e) => setItemTitle(e.target.value)} value={title} />
        <Label htmlFor={descriptionId}>{t('description')}</Label>
        <MaterialTextField
          InputProps={{ disableUnderline: true }}
          className={classes.field}
          fullWidth
          id={descriptionId}
          margin='normal'
          multiline={true}
          onBlur={onChangeDescription}
          onChange={(e) => setItemDescription(e.target.value)}
          style={{ height: 100 }}
          value={description}
        />
      </Fieldset>
    </div>
  );
}
