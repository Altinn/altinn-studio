import React from 'react';
import type { IToolbarElement } from '../../../types/global';
import classes from './AddItemContent.module.css';
import type { AddedItem } from './types';
import { ComponentButton } from './ComponentButton';
import { useFormLayouts } from '../../../hooks';
import { generateComponentId } from '@altinn/ux-editor/utils/generateId';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { getTitleByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';

export type DefaultItemsProps = {
  item: AddedItem | null;
  setItem: (item: AddedItem | null) => void;
  onAddItem: (addedItem: AddedItem) => void;
  onCancel: () => void;
  availableComponents: IToolbarElement[];
};

export const DefaultItems = ({
  item,
  setItem,
  onAddItem,
  onCancel,
  availableComponents,
}: DefaultItemsProps) => {
  const layouts = useFormLayouts();
  const { t } = useTranslation();

  return (
    <div className={classes.root}>
      <div>
        {availableComponents.map((key) => {
          return (
            <ComponentButton
              key={key.type}
              tooltipContent={getTitleByComponentType(key.type as ComponentType, t) || key.label}
              selected={false}
              icon={() => null}
              onClick={() =>
                onAddItem({
                  componentType: key.type,
                  componentId: generateComponentId(key.type as ComponentType, layouts),
                })
              }
              inline
            />
          );
        })}
      </div>
    </div>
  );
};
