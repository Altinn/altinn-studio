import { Checkbox, FormControlLabel, TextField } from '@material-ui/core';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CombinationKind,
  FieldType,
  ILanguage,
  ISchemaState,
  UiSchemaItem,
} from '../types';
import { NameError, ObjectKind } from '../types/enums';
import { isValidName } from '../utils/checks';
import { getTranslation } from '../utils/language';
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
} from '../features/editor/schemaEditorSlice';
import {
  combinationIsNullable,
  getDomFriendlyID,
  nullableType,
} from '../utils/schema';
import { TypeSelect } from './TypeSelect';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { CombinationSelect } from './CombinationSelect';

export interface IItemDataComponentProps {
  selectedId: string;
  selectedItem: UiSchemaItem | null;
  parentItem: UiSchemaItem | null;
  objectKind: ObjectKind;
  language: ILanguage;
  checkIsNameInUse: (name: string) => boolean;
}

const useStyles = makeStyles(
  createStyles({
    divider: {
      marginTop: 2,
      marginBottom: 2,
      padding: '8px 2px 8px 2px',
    },
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
  selectedId,
  selectedItem,
  parentItem,
  objectKind,
  checkIsNameInUse,
}: IItemDataComponentProps) {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [nameError, setNameError] = React.useState('');
  const [nodeName, setNodeName] = React.useState('');
  const [description, setItemDescription] = React.useState<string>('');
  const [title, setItemTitle] = React.useState<string>('');
  const [fieldType, setFieldType] = React.useState<FieldType | undefined>(
    undefined,
  );
  const [arrayType, setArrayType] = React.useState<
    FieldType | string | undefined
  >(undefined);

  const focusName = useSelector((state: ISchemaState) => state.focusNameField);

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
    setNameError(NameError.NoError);
    setItemTitle(selectedItem?.title ?? '');
    setItemDescription(selectedItem?.description ?? '');
    setFieldType(selectedItem?.type);
    setArrayType(selectedItem?.items?.$ref ?? selectedItem?.items?.type ?? '');
  }, [selectedItem, parentItem]);

  const nameFieldRef = React.useCallback(
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

  return (
    <div>
      {!selectedItem?.combinationItem && (
        <>
          <p className={classes.name}>{getTranslation('name', language)}</p>
          <TextField
            id='selectedItemName'
            className={classes.field}
            inputRef={nameFieldRef}
            aria-describedby='Selected Item Name'
            placeholder='Name'
            fullWidth={true}
            value={nodeName}
            error={!!nameError}
            helperText={getTranslation(nameError, language)}
            onChange={onNameChange}
            onBlur={handleChangeNodeName}
            InputProps={{
              disableUnderline: true,
              classes: { root: classes.fieldText },
            }}
          />
        </>
      )}
      {selectedItem && objectKind === ObjectKind.Field && (
        <>
          <p className={classes.header}>{getTranslation('type', language)}</p>
          <TypeSelect
            value={selectedItem.type === 'array' ? arrayType : fieldType}
            id={`${getDomFriendlyID(selectedItem.path)}-type-select`}
            onChange={
              selectedItem.type === 'array' ? onChangeArrayType : onChangeType
            }
            language={language}
          />
        </>
      )}
      <ReferenceSelectionComponent
        arrayType={arrayType}
        classes={classes}
        selectedItem={selectedItem}
        objectKind={objectKind}
        language={language}
        onChangeArrayType={onChangeArrayType}
        onChangeRef={onChangeRef}
        onGoToDefButtonClick={onGoToDefButtonClick}
      />
      {(objectKind === ObjectKind.Reference ||
        objectKind === ObjectKind.Field) && (
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
          label={getTranslation('multiple_answers', language)}
        />
      )}
      {objectKind === ObjectKind.Combination && (
        <>
          <p className={classes.header}>{getTranslation('type', language)}</p>
          <CombinationSelect
            value={selectedItem?.combinationKind}
            id={`${getDomFriendlyID(
              selectedItem?.path || '',
            )}-change-combination`}
            onChange={onChangeCombinationType}
            language={language}
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
          label={getTranslation('nullable', language)}
        />
      )}
      <hr className={classes.divider} />
      <p className={classes.header}>
        {getTranslation('descriptive_fields', language)}
      </p>
      <p className={classes.header}>{getTranslation('title', language)}</p>
      <TextField
        id={`${getDomFriendlyID(selectedId ?? '')}-title`}
        className={classes.field}
        fullWidth
        value={title}
        margin='normal'
        onChange={(e) => setItemTitle(e.target.value)}
        onBlur={onChangeTitle}
        InputProps={{
          disableUnderline: true,
          classes: { root: classes.fieldText },
        }}
      />
      <p className={classes.header}>
        {getTranslation('description', language)}
      </p>
      <TextField
        id={`${getDomFriendlyID(selectedId ?? '')}-description`}
        multiline={true}
        className={classes.field}
        fullWidth
        style={{ height: 100 }}
        value={description}
        margin='normal'
        onChange={(e) => setItemDescription(e.target.value)}
        onBlur={onChangeDescription}
        InputProps={{
          disableUnderline: true,
          classes: { root: classes.fieldText },
        }}
      />
    </div>
  );
}
