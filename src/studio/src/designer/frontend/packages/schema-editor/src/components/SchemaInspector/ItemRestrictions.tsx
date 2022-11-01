import React, { MouseEvent } from 'react';
import { getTranslation } from '../../utils/language';
import type { ILanguage } from '../../types';
import type { UiSchemaNode } from '@altinn/schema-model';
import { FieldType } from '@altinn/schema-model';
import { EnumField } from './EnumField';
import { addEnum, deleteEnum, setRequired, setRestriction } from '../../features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import { ArrayRestrictions } from './restrictions/ArrayRestrictions';
import { NumberRestrictions } from './restrictions/NumberRestrictions';
import { ObjectRestrictions } from './restrictions/ObjectRestrictions';
import { StringRestrictions } from './restrictions/StringRestrictions';
import classes from './ItemRestrictions.module.css';
import { Button, Checkbox, FieldSet } from '@altinn/altinn-design-system';
import { Divider } from '../common/Divider';

export interface RestrictionItemProps {
  restrictions: any;
  readonly: boolean;
  path: string;
  language: ILanguage;
  onChangeRestrictionValue: (id: string, key: string, value?: string) => void;
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
        }),
      );
    }
  };

  const onChangeRestrictionValue = (path: string, key: string, value?: string) =>
    dispatch(
      setRestriction({
        path,
        key,
        value,
      }),
    );

  const onChangeEnumValue = (value: string, oldValue?: string) =>
    dispatch(
      addEnum({
        path: selectedNode.pointer,
        value,
        oldValue,
      }),
    );

  const onDeleteEnumClick = (path: string, value: string) => dispatch(deleteEnum({ path, value }));

  const dispatchAddEnum = () =>
    dispatch(
      addEnum({
        path: selectedNode.pointer,
        value: 'value',
      }),
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
      {[FieldType.String, FieldType.Integer, FieldType.Number].includes(selectedNode.fieldType as FieldType) && (
        <>
          <Divider inMenu />
          <FieldSet legend={t('enum_legend')}>
            {!selectedNode.enum?.length && <p className={classes.emptyEnumMessage}>{t('enum_empty')}</p>}
            {selectedNode.enum?.map((value: string, index) => (
              <EnumField
                fullWidth={true}
                key={'add-enum-field-' + index}
                language={language}
                onChange={onChangeEnumValue}
                onDelete={onDeleteEnumClick}
                onEnterKeyPress={dispatchAddEnum}
                path={selectedNode.pointer}
                value={value}
              />
            ))}
            <Button
              aria-label={t('add_enum')}
              className={classes.addEnumButton}
              id='add-enum-button'
              onClick={onAddEnumButtonClick}
            >
              <i />
              <span>{t('add_enum')}</span>
            </Button>
          </FieldSet>
        </>
      )}
    </>
  );
};
