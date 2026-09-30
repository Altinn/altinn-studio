import React from 'react';
import type { IToolbarElement } from '../../../types/global';
import classes from './DefaultItems.module.css';
import { StudioHeading } from '@studio/components';
import type { AddedItem } from './types';
import { ComponentButton } from './ComponentButton';
import { useFormLayouts } from '../../../hooks';
import { generateComponentId } from '@altinn/ux-editor/utils/generateId';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { getTitleByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';

export type DefaultItemsProps = {
  onAddItem: (addedItem: AddedItem) => void;
  availableComponents: IToolbarElement[];
  showAllButton: React.ReactNode;
};

export const DefaultItems = ({
  onAddItem,
  availableComponents,
  showAllButton,
}: DefaultItemsProps) => {
  const layouts = useFormLayouts();
  const { t } = useTranslation(['translation', 'addComponentModal']);

  return (
    <>
      <StudioHeading level={4}>{t('ux_editor.add_item.components_header')}</StudioHeading>
      <div className={classes.componentsWrapper}>
        {availableComponents.map((key) => {
          return (
            <ComponentButton
              key={key.type}
              tooltipContent={getTitleByComponentType(key.type as ComponentType, t) || key.label}
              selected={false}
              icon={key.icon}
              onClick={() =>
                onAddItem({
                  componentType: key.type,
                  componentId: generateComponentId(key.type as ComponentType, layouts),
                })
              }
              inline={true}
            />
          );
        })}
        {showAllButton}
      </div>
    </>
  );
};
