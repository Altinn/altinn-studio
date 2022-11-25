import type { MouseEvent } from 'react';
import React from 'react';
import { getTranslation } from '../../utils/language';
import type { ILanguage } from '../../types';
import type { UiSchemaNode, Dict } from '@altinn/schema-model';
import { FieldType } from '@altinn/schema-model';
import { EnumField } from './EnumField';
import {
  addEnum,
  deleteEnum,
  setRequired,
  setRestriction,
  setRestrictions,
} from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import { ArrayRestrictions } from './restrictions/ArrayRestrictions';
import { NumberRestrictions } from './restrictions/NumberRestrictions';
import { ObjectRestrictions } from './restrictions/ObjectRestrictions';
import { StringRestrictions } from './restrictions/StringRestrictions';
import classes from './ItemRestrictions.module.css';
import {
  Button,
  ButtonColor,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  FieldSet,
} from '@altinn/altinn-design-system';
import { Divider } from 'app-shared/primitives';

export interface RestrictionItemProps {
  restrictions: any;
  readonly: boolean;
  path: string;
  language: ILanguage;
  onChangeRestrictionValue: (id: string, key: string, value?: string) => void;
  onChangeRestrictions: (id: string, restrictions: Dict) => void;
}
export interface ItemRestrictionsProps {
  selectedNode: UiSchemaNode;
  language: ILanguage;
}
export const ItemRestrictions = ({ selectedNode, language }: ItemRestrictionsProps) => {
  const dispatch = useDispatch();
  const handleRequiredChanged = (e: any) => {
    const { checked } = e.target;
    if (checked !== selectedNode.isRequired) {
      dispatch(
        setRequired({
          path: selectedNode.pointer,
          required: checked,
        })
      );
    }
  };

  const onChangeRestrictionValue = (path: string, key: string, value?: string) =>
    dispatch(
      setRestriction({
        path,
        key,
        value,
      })
    );

  const onChangeRestrictions = (path: string, restrictions: Dict) =>
    dispatch(setRestrictions({ path, restrictions }));

  const onChangeEnumValue = (value: string, oldValue?: string) =>
    dispatch(
      addEnum({
        path: selectedNode.pointer,
        value,
        oldValue,
      })
    );

  const onDeleteEnumClick = (path: string, value: string) => dispatch(deleteEnum({ path, value }));

  const dispatchAddEnum = () =>
    dispatch(
      addEnum({
        path: selectedNode.pointer,
        value: 'value',
      })
    );

  const onAddEnumButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dispatchAddEnum();
  };

  const t = (key: string) => getTranslation(key, language);
  const restrictionProps: RestrictionItemProps = {
    restrictions: selectedNode.restrictions ?? {},
    readonly: selectedNode.ref !== undefined,
    path: selectedNode.pointer ?? '',
    onChangeRestrictionValue,
    onChangeRestrictions,
    language,
  };
  return (
    <>
      <Checkbox
        checked={selectedNode.isRequired}
        label={t('required')}
        name='checkedRequired'
        onChange={handleRequiredChanged}
      />
      {selectedNode.ref === undefined &&
        {
          [FieldType.Integer]: <NumberRestrictions {...restrictionProps} />,
          [FieldType.Number]: <NumberRestrictions {...restrictionProps} />,
          [FieldType.Object]: <ObjectRestrictions {...restrictionProps} />,
          [FieldType.String]: <StringRestrictions {...restrictionProps} />,
        }[selectedNode.fieldType as string]}
      {selectedNode.isArray && <ArrayRestrictions {...restrictionProps} />}
      {[FieldType.String, FieldType.Integer, FieldType.Number].includes(
        selectedNode.fieldType as FieldType
      ) && (
        <>
          <Divider inMenu />
          <FieldSet legend={t('enum_legend')}>
            {!selectedNode.enum?.length && (
              <p className={classes.emptyEnumMessage}>{t('enum_empty')}</p>
            )}
            {selectedNode.enum?.map((value: string, index) => (
              <EnumField
                fullWidth={true}
                key={`add-enum-field-${index}`}
                language={language}
                onChange={onChangeEnumValue}
                onDelete={onDeleteEnumClick}
                onEnterKeyPress={dispatchAddEnum}
                path={selectedNode.pointer}
                value={value}
              />
            ))}
            <div className={classes.addEnumButton}>
              <Button
                aria-label={t('add_enum')}
                color={ButtonColor.Secondary}
                fullWidth
                iconName={'Add'}
                id='add-enum-button'
                onClick={onAddEnumButtonClick}
                size={ButtonSize.Small}
                variant={ButtonVariant.Outline}
              >
                {t('add_enum')}
              </Button>
            </div>
          </FieldSet>
        </>
      )}
    </>
  );
};
