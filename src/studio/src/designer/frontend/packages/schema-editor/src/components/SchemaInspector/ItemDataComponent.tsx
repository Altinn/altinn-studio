import {
  Checkbox,
  Divider,
  FormControlLabel,
  TextField,
} from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CombinationKind,
  FieldType,
  ILanguage,
  ISchemaState,
  UiSchemaItem,
} from '../../types';
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
import {
  combinationIsNullable,
  getDomFriendlyID,
  nullableType,
} from '../../utils/schema';
import { TypeSelect } from './TypeSelect';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { CombinationSelect } from './CombinationSelect';
import { getObjectKind } from '../../utils/ui-schema-utils';
import { Label } from './Label';
import { getCombinationOptions, getTypeOptions } from './helpers/options';

export interface IItemDataComponentProps {
  selectedItem: UiSchemaItem | null;
  language: ILanguage;
  checkIsNameInUse: (name: string) => boolean;
}

const useStyles = makeStyles(
  createStyles({
    field: {
      background: 'white',
      color: 'black',
      border: '1px solid #006BD8',
      boxSsizing: 'border-box',
      marginTop: 2,
      padding: 4,
      '&.Mui-disabled': {
        background: '#f4f4f4',
        color: 'black',
        border: '1px solid #6A6A6A',
        boxSizing: 'border-box',
      },
    },
    fieldText: {
      fontSize: '1.6rem',
    },
    header: {
      padding: 0,
      fontWeight: 400,
      fontSize: 16,
      marginTop: 24,
      marginBottom: 6,
      '& .Mui-focusVisible': {
        background: 'gray',
      },
    },
    name: {
      marginBottom: 6,
      padding: 0,
      fontWeight: 400,
      fontSize: 16,
    },
    navButton: {
      background: 'none',
      border: 'none',
      textDecoration: 'underline',
      cursor: 'pointer',
      color: '#006BD8',
    },
  }),
);

export function ItemDataComponent({
  language,
  selectedItem,
  checkIsNameInUse,
}: IItemDataComponentProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const objectKind = getObjectKind(selectedItem ?? undefined);
  const selectedId = selectedItem?.path ?? '';
  const [nameError, setNameError] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [description, setItemDescription] = useState<string>('');
  const [title, setItemTitle] = useState<string>('');
  const [fieldType, setFieldType] = useState<FieldType | undefined>(undefined);
  const [arrayType, setArrayType] = useState<FieldType | string | undefined>(
    undefined,
  );

  const focusName = useSelector((state: ISchemaState) => state.focusNameField);

  useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
    setNameError(NameError.NoError);
    setItemTitle(selectedItem?.title ?? '');
    setItemDescription(selectedItem?.description ?? '');
    setFieldType(selectedItem?.type);
    setArrayType(selectedItem?.items?.$ref ?? selectedItem?.items?.type ?? '');
  }, [selectedItem]);

  const nameFieldRef = useCallback(
    (node: any) => {
      if (node && focusName && focusName === selectedId) {
        setTimeout(() => {
          node.select();
        }, 100);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [focusName, selectedId],
  );

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
          props: { type: 'null' },
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
      const type =
        objectKind === ObjectKind.Reference
          ? selectedItem.$ref
          : selectedItem.type;
      onChangeArrayType(type);
      onChangeType('array');
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
  const inputProps = {
    disableUnderline: true,
    classes: { root: classes.fieldText },
  };
  return (
    <div>
      {!selectedItem?.combinationItem && (
        <>
          <p className={classes.name}>{t('name')}</p>
          <TextField
            InputProps={inputProps}
            aria-describedby='Selected Item Name'
            className={classes.field}
            error={!!nameError}
            fullWidth={true}
            helperText={t(nameError)}
            id='selectedItemName'
            inputRef={nameFieldRef}
            onBlur={handleChangeNodeName}
            onChange={onNameChange}
            placeholder='Name'
            value={nodeName}
          />
        </>
      )}
      {selectedItem && objectKind === ObjectKind.Field && (
        <>
          <Label>{t('type')}</Label>
          <TypeSelect
            value={selectedItem.type === 'array' ? arrayType : fieldType}
            id={`${getDomFriendlyID(selectedItem.path)}-type-select`}
            onChange={
              selectedItem.type === 'array' ? onChangeArrayType : onChangeType
            }
            label={t('type')}
            options={getTypeOptions(t)}
          />
        </>
      )}
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
              checked={selectedItem?.type === 'array'}
              onChange={handleIsArrayChanged}
              name='checkedMultipleAnswers'
            />
          }
          label={t('multiple_answers')}
        />
      )}
      {objectKind === ObjectKind.Combination && (
        <>
          <Label>{t('type')}</Label>
          <CombinationSelect
            id={`${getDomFriendlyID(selectedItem?.path || '')}-combi-sel`}
            label={t('type')}
            onChange={onChangeCombinationType}
            options={getCombinationOptions(t)}
            value={selectedItem?.combinationKind}
          />
        </>
      )}
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
      <Divider />
      <Label>{t('descriptive_fields')}</Label>
      <TextField
        InputProps={inputProps}
        className={classes.field}
        fullWidth
        id={`${getDomFriendlyID(selectedId ?? '')}-title`}
        margin='normal'
        onBlur={onChangeTitle}
        onChange={(e) => setItemTitle(e.target.value)}
        value={title}
      />
      <Label>{t('description')}</Label>
      <TextField
        InputProps={inputProps}
        className={classes.field}
        fullWidth
        id={`${getDomFriendlyID(selectedId ?? '')}-description`}
        margin='normal'
        multiline={true}
        onBlur={onChangeDescription}
        onChange={(e) => setItemDescription(e.target.value)}
        style={{ height: 100 }}
        value={description}
      />
    </div>
  );
}
