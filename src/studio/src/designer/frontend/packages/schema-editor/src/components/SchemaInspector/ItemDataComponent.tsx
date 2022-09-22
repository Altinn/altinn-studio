import { Checkbox, FormControlLabel, TextField as MaterialTextField } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { CombinationKind, FieldType, ILanguage, UiSchemaItem } from '../../types';
import { NameError, ObjectKind } from '../../types/enums';
import { isValidName } from '../../utils/checks';
import { getTranslation } from '../../utils/language';
import {
  addCombinationItem,
  deleteCombinationItem,
  navigateToType,
  setCombinationType,
  setDescription,
  setItems,
  setPropertyName,
  setRef,
  setTitle,
  setType,
} from '../../features/editor/schemaEditorSlice';
import { combinationIsNullable, getDomFriendlyID, nullableType } from '../../utils/schema';
import { TypeSelect } from './TypeSelect';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { CombinationSelect } from './CombinationSelect';
import { getObjectKind } from '../../utils/ui-schema-utils';
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import { ErrorMessage, TextField } from '@altinn/altinn-design-system';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from "./ItemRestrictions";

export interface IItemDataComponentProps {
  selectedItem: UiSchemaItem | null;
  language: ILanguage;
  checkIsNameInUse: (name: string) => boolean;
}

export function ItemDataComponent({ language, selectedItem, checkIsNameInUse }: IItemDataComponentProps) {
  const dispatch = useDispatch();
  const objectKind = getObjectKind(selectedItem ?? undefined);
  const selectedId = selectedItem?.path ?? '';
  const [nameError, setNameError] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [description, setItemDescription] = useState<string>('');
  const [title, setItemTitle] = useState<string>('');
  const [fieldType, setFieldType] = useState<FieldType | undefined>(undefined);
  const [arrayType, setArrayType] = useState<FieldType | string | undefined>(undefined);

  useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
    setNameError(NameError.NoError);
    setItemTitle(selectedItem?.title ?? '');
    setItemDescription(selectedItem?.description ?? '');
    setFieldType(selectedItem?.type);
    setArrayType(selectedItem?.items?.$ref ?? selectedItem?.items?.type ?? '');
  }, [selectedItem]);

  const onNameChange = (e: any) => {
    const name: string = e.target.value;
    setNodeName(name);
    if (!isValidName(name)) {
      setNameError(NameError.InvalidCharacter);
    } else {
      setNameError(NameError.NoError);
    }
  };

  const onChangeRef = (path: string, ref: string) => {
    const data = {
      path,
      ref,
    };
    dispatch(setRef(data));
  };

  const onChangeType = (type: FieldType) => {
    if (selectedItem) {
      dispatch(
        setType({
          path: selectedItem.path,
          type,
        }),
      );
      setFieldType(type);
    }
  };

  const onChangeNullable = (_x: any, nullable: boolean) => {
    if (nullable && selectedItem) {
      dispatch(
        addCombinationItem({
          path: selectedItem.path,
          props: { type: FieldType.Null },
        }),
      );
    } else {
      const itemToRemove = selectedItem?.combination?.find(nullableType);
      if (itemToRemove) {
        dispatch(deleteCombinationItem({ path: itemToRemove.path }));
      }
    }
  };

  const onChangeTitle = () => {
    dispatch(setTitle({ path: selectedId, title }));
  };

  const onChangeDescription = () => {
    dispatch(setDescription({ path: selectedId, description }));
  };

  const onGoToDefButtonClick = () => {
    if (!selectedItem?.$ref) {
      return;
    }
    dispatch(
      navigateToType({
        id: selectedItem?.$ref,
      }),
    );
  };

  const onChangeArrayType = (type: string | FieldType | undefined) => {
    if (selectedItem) {
      setArrayType(type ?? '');
      let items;
      if (type === undefined) {
        items = undefined;
      } else {
        items = objectKind === ObjectKind.Field ? { type } : { $ref: type };
      }
      dispatch(
        setItems({
          path: selectedItem.path,
          items,
        }),
      );
    }
  };

  const onChangeCombinationType = (value: CombinationKind) => {
    if (selectedItem?.path) {
      dispatch(
        setCombinationType({
          path: selectedItem.path,
          type: value,
        }),
      );
    }
  };

  const handleIsArrayChanged = (e: any, checked: boolean) => {
    if (!selectedItem) {
      return;
    }

    if (checked) {
      const type = objectKind === ObjectKind.Reference ? selectedItem.$ref : selectedItem.type;
      onChangeArrayType(type);
      onChangeType(FieldType.Array);
    } else {
      if (objectKind === ObjectKind.Reference) {
        onChangeRef(selectedItem.path, arrayType || '');
      } else {
        onChangeType(arrayType as FieldType);
      }
      onChangeArrayType(undefined);
    }
  };

  const handleChangeNodeName = () => {
    if (checkIsNameInUse(nodeName)) {
      setNameError(NameError.AlreadyInUse);
      return;
    }

    if (!nameError && selectedItem && selectedItem.displayName !== nodeName) {
      dispatch(
        setPropertyName({
          path: selectedItem.path,
          name: nodeName,
          navigate: selectedItem.path,
        }),
      );
    }
  };
  const t = (key: string) => getTranslation(key, language);

  const TypeSelectWithLabel = () => {
    if (selectedItem && objectKind === ObjectKind.Field) {
      const typeSelectId = `${getDomFriendlyID(selectedItem.path)}-type-select`;
      return (
        <>
          <label htmlFor={typeSelectId}>{t('type')}</label>
          <TypeSelect
            value={selectedItem.type === FieldType.Array ? arrayType : fieldType}
            id={typeSelectId}
            onChange={selectedItem.type === FieldType.Array ? onChangeArrayType : onChangeType}
            label={t('type')}
            options={getTypeOptions(t)}
          />
        </>
      );
    } else return null;
  }

  const CombinationSelectWithLabel = () => {
    if (objectKind === ObjectKind.Combination) {
      const combinationSelectId = `${getDomFriendlyID(selectedItem?.path || '')}-combi-sel`;
      return (
        <>
          <label htmlFor={combinationSelectId}>{t('type')}</label>
          <CombinationSelect
            id={combinationSelectId}
            label={t('type')}
            onChange={onChangeCombinationType}
            options={getCombinationOptions(t)}
            value={selectedItem?.combinationKind}
          />
        </>
      );
    } else return null;
  }

  const titleId = `${getDomFriendlyID(selectedId ?? '')}-title`;
  const descriptionId = `${getDomFriendlyID(selectedId ?? '')}-description`;

  return (
    <div>
      {!selectedItem?.combinationItem && (
        <>
          <label htmlFor='selectedItemName'>{t('name')}</label>
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
      <TypeSelectWithLabel/>
      <ReferenceSelectionComponent
        arrayType={arrayType}
        buttonText={t('go_to_type')}
        classes={classes}
        label={t('reference_to')}
        objectKind={objectKind}
        onChangeArrayType={onChangeArrayType}
        onChangeRef={onChangeRef}
        onGoToDefButtonClick={onGoToDefButtonClick}
        selectedItem={selectedItem}
      />
      {[ObjectKind.Reference, ObjectKind.Field].includes(objectKind) && (
        <FormControlLabel
          id='multiple-answers-checkbox'
          className={classes.header}
          control={
            <Checkbox
              color='primary'
              checked={selectedItem?.type === FieldType.Array}
              onChange={handleIsArrayChanged}
              name='checkedMultipleAnswers'
            />
          }
          label={t('multiple_answers')}
        />
      )}
      <CombinationSelectWithLabel/>
      {objectKind === ObjectKind.Combination && (
        <FormControlLabel
          id='multiple-answers-checkbox'
          className={classes.header}
          control={
            <Checkbox
              color='primary'
              checked={combinationIsNullable(selectedItem)}
              onChange={onChangeNullable}
              name='checkedNullable'
            />
          }
          label={t('nullable')}
        />
      )}
      {selectedItem && <ItemRestrictions item={selectedItem} language={language}/>}
      <hr/>
      <fieldset>
        <legend>{t('descriptive_fields')}</legend>
        <label htmlFor={titleId}>{t('title')}</label>
        <TextField
          id={titleId}
          onBlur={onChangeTitle}
          onChange={(e) => setItemTitle(e.target.value)}
          value={title}
        />
        <label htmlFor={descriptionId}>{t('description')}</label>
        <MaterialTextField
          InputProps={{disableUnderline: true}}
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
      </fieldset>
    </div>
  );
}
