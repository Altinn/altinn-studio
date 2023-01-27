import type { ChangeEvent } from 'react';
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
  toggleArrayField,
} from '../../features/editor/schemaEditorSlice';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import {
  Checkbox,
  ErrorMessage,
  FieldSet,
  Select,
  TextArea,
  TextField,
} from '@digdir/design-system-react';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import type { UiSchemaNode, CombinationKind } from '@altinn/schema-model';
import {
  combinationIsNullable,
  FieldType,
  getChildNodesByPointer,
  getNameFromPointer,
  hasNodePointer,
  ObjectKind,
} from '@altinn/schema-model';
import { getDomFriendlyID, isValidName } from '../../utils/ui-schema-utils';
import { Divider } from 'app-shared/primitives';

export interface IItemDataComponentProps {
  selectedItem: UiSchemaNode;
  language: ILanguage;
}

export function ItemDataComponent({ language, selectedItem }: IItemDataComponentProps) {
  const dispatch = useDispatch();

  const { fieldType, pointer: selectedNodePointer } = selectedItem;
  const [nodeName, setNodeName] = useState(getNameFromPointer({ pointer: selectedNodePointer }));

  const [nameError, setNameError] = useState('');
  const [description, setItemDescription] = useState<string>('');
  const [title, setItemTitle] = useState<string>('');

  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);

  const childNodes = getChildNodesByPointer(uiSchema, selectedNodePointer);

  useEffect(() => {
    setNameError(NameError.NoError);
    setItemTitle(selectedItem.title ?? '');
    setItemDescription(selectedItem.description ?? '');
  }, [selectedItem]);

  useEffect(() => {
    !isValidName(nodeName)
      ? setNameError(NameError.InvalidCharacter)
      : setNameError(NameError.NoError);
    if (!nameError && hasNodePointer(uiSchema, nodeName)) {
      setNameError(NameError.AlreadyInUse);
    }
  }, [nodeName, nameError, setNameError, uiSchema]);
  const onNameChange = ({ target }: ChangeEvent) => {
    const { value } = target as HTMLInputElement;
    setNodeName(value);
  };

  const onChangeRef = (path: string, ref: string) => dispatch(setRef({ path, ref }));

  const onChangeFieldType = (type: FieldType) =>
    dispatch(setType({ path: selectedNodePointer, type }));

  const onChangeNullable = (event: ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    if (isChecked) {
      dispatch(
        addCombinationItem({ pointer: selectedNodePointer, props: { fieldType: FieldType.Null } })
      );
      return;
    }

    childNodes.forEach((childNode: UiSchemaNode) => {
      if (childNode.fieldType === FieldType.Null) {
        dispatch(deleteCombinationItem({ path: childNode.pointer }));
      }
    });
  };

  const onChangeTitle = () => dispatch(setTitle({ path: selectedNodePointer, title }));

  const onChangeDescription = () =>
    dispatch(setDescription({ path: selectedNodePointer, description }));

  const onGoToDefButtonClick = () => {
    const ref = selectedItem.ref;
    if (ref !== undefined) {
      dispatch(navigateToType({ pointer: ref }));
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    dispatch(setCombinationType({ path: selectedNodePointer, type: value }));

  const handleArrayPropertyToggle = () =>
    dispatch(toggleArrayField({ pointer: selectedNodePointer }));

  const handleChangeNodeName = () => {
    if (nameError) {
      return;
    }
    const displayName = getNameFromPointer(selectedItem);
    if (!nameError && displayName !== nodeName) {
      dispatch(
        setPropertyName({
          path: selectedNodePointer,
          name: nodeName,
          navigate: true,
        })
      );
    }
  };

  const t = (key: string) => getTranslation(key, language);
  const titleId = getDomFriendlyID(selectedNodePointer, { suffix: 'title' });
  const descriptionId = getDomFriendlyID(selectedNodePointer, { suffix: 'description' });
  return (
    <div className={classes.root}>
      {!selectedItem.isCombinationItem && (
        <div>
          <TextField
            aria-describedby='Selected Item Name'
            aria-errormessage={t(nameError)}
            aria-placeholder='Name'
            id='selectedItemName'
            label={t('name')}
            onBlur={handleChangeNodeName}
            onChange={onNameChange}
            placeholder='Name'
            value={nodeName}
          />
          {nameError && <ErrorMessage>{t(nameError)}</ErrorMessage>}
        </div>
      )}
      {selectedItem.objectKind === ObjectKind.Field && (
        <Select
          label={t('type')}
          onChange={(type: FieldType) => onChangeFieldType(type)}
          options={getTypeOptions(t)}
          value={fieldType as string}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Reference && (
        <ReferenceSelectionComponent
          buttonText={t('go_to_type')}
          emptyOptionLabel={t('choose_type')}
          label={t('reference_to')}
          onChangeRef={onChangeRef}
          onGoToDefButtonClick={onGoToDefButtonClick}
          selectedNode={selectedItem}
        />
      )}
      {selectedItem.objectKind !== ObjectKind.Combination && (
        <Checkbox
          checked={selectedItem.isArray}
          label={t('multiple_answers')}
          name='checkedMultipleAnswers'
          onChange={handleArrayPropertyToggle}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <Select
          label={t('type')}
          onChange={(combination: string) =>
            onChangeCombinationType(combination as CombinationKind)
          }
          options={getCombinationOptions(t)}
          value={selectedItem.fieldType}
        />
      )}
      {selectedItem.objectKind === ObjectKind.Combination && (
        <Checkbox
          checkboxId='multiple-answers-checkbox'
          checked={combinationIsNullable(childNodes)}
          label={t('nullable')}
          name='checkedNullable'
          onChange={onChangeNullable}
        />
      )}
      <ItemRestrictions selectedNode={selectedItem} language={language} />
      <Divider inMenu />
      <FieldSet legend={t('descriptive_fields')} className={classes.fieldSet}>
        <div>
          <TextField
            id={titleId}
            label={t('title')}
            onBlur={onChangeTitle}
            onChange={(e: ChangeEvent) => setItemTitle((e.target as HTMLInputElement)?.value)}
            value={title}
          />
        </div>
        <div>
          <TextArea
            id={descriptionId}
            label={t('description')}
            onBlur={onChangeDescription}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setItemDescription(event.target.value)
            }
            style={{ height: 100 }}
            value={description}
          />
        </div>
      </FieldSet>
    </div>
  );
}
