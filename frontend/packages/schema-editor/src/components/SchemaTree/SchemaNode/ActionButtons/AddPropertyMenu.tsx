import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import { ObjectKind } from '@altinn/schema-model';
import { PlusIcon } from '@navikt/aksel-icons';
import { CombinationIcon, PropertyIcon, ReferenceIcon } from '@studio/icons';
import { StudioDropdownMenu } from '@studio/components';

interface AddPropertyMenuProps {
  pointer: string;
}

export const AddPropertyMenu = ({ pointer }: AddPropertyMenuProps) => {
  const { t } = useTranslation();
  const addProperty = useAddProperty();

  const addField = () => addPropertyAndClose(ObjectKind.Field);
  const addCombination = () => addPropertyAndClose(ObjectKind.Combination);
  const addReference = () => addPropertyAndClose(ObjectKind.Reference);

  const addPropertyAndClose = (kind: ObjectKind) => {
    addProperty(kind, undefined, pointer);
  };

  return (
    <>
      <StudioDropdownMenu
        anchorButtonProps={{
          'aria-label': t('schema_editor.add_node_of_type'),
          icon: <PlusIcon title="t('schema_editor.add_node_of_type)" />,
          size: 'small',
          variant: 'tertiary',
        }}
      >
        <StudioDropdownMenu.Content>
          <StudioDropdownMenu.Group>
            <StudioDropdownMenu.Item onClick={addField}>
              <PropertyIcon />
              {t('schema_editor.add_field')}
            </StudioDropdownMenu.Item>
            <StudioDropdownMenu.Item onClick={addCombination}>
              <CombinationIcon />
              {t('schema_editor.add_combination')}
            </StudioDropdownMenu.Item>
            <StudioDropdownMenu.Item onClick={addReference}>
              <ReferenceIcon />
              {t('schema_editor.add_reference')}
            </StudioDropdownMenu.Item>
          </StudioDropdownMenu.Group>
        </StudioDropdownMenu.Content>
      </StudioDropdownMenu>
    </>
  );
};
