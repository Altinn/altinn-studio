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
} from '@altinn/altinn-design-system';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import type { UiSchemaNode, CombinationKind } from '@altinn/schema-model';
import {
  combinationIsNullable,
  FieldType,
  getChildNodesByPointer,
  getNodeDisplayName,
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
  const selectedNodePointer = selectedItem.pointer;
  const [nameError, setNameError] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [description, setItemDescription] = useState<string>('');
  const [title, setItemTitle] = useState<string>('');
  const { fieldType } = selectedItem;

  const childNodes = useSelector((state: ISchemaState) =>
    getChildNodesByPointer(state.uiSchema, selectedItem.pointer)
  );

  useEffect(() => {
    setNodeName(getNodeDisplayName(selectedItem));
    setNameError(NameError.NoError);
    setItemTitle(selectedItem.title ?? '');
    setItemDescription(selectedItem.description ?? '');
  }, [selectedItem]);

  const onNameChange = ({ target }: ChangeEvent) => {
    const { value } = target as HTMLInputElement;
    setNodeName(value);
    !isValidName(value)
      ? setNameError(NameError.InvalidCharacter)
      : setNameError(NameError.NoError);
  };

  const onChangeRef = (path: string, ref: string) => dispatch(setRef({ path, ref }));

  const onChangeFieldType = (pointer: string, type: FieldType) =>
    dispatch(setType({ path: selectedItem.pointer, type }));

  const onChangeNullable = (event: ChangeEvent) => {
    if ((event.target as HTMLInputElement)?.checked) {
      dispatch(
        addCombinationItem({ pointer: selectedItem.pointer, props: { fieldType: FieldType.Null } })
      );
    } else {
      childNodes.forEach((childNode: UiSchemaNode) => {
        if (childNode.fieldType === FieldType.Null) {
          dispatch(deleteCombinationItem({ path: childNode.pointer }));
        }
      });
    }
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
    dispatch(setCombinationType({ path: selectedItem.pointer, type: value }));

  const handleArrayPropertyToggle = () =>
    dispatch(toggleArrayField({ pointer: selectedItem.pointer }));

  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const handleChangeNodeName = () => {
    if (hasNodePointer(uiSchema, nodeName)) {
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
            autoFocus
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
          onChange={(type: string) => onChangeFieldType(selectedItem.pointer, type as FieldType)}
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
