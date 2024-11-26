import React from 'react';
import type { IToolbarElement } from '../../../types/global';
import classes from './DefaultItems.module.css';
import { StudioActionCloseButton, StudioButton, StudioHeading } from '@studio/components';
import { XMarkIcon } from '@studio/icons';
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
  showAllButton: React.ReactNode;
};

export const DefaultItems = ({
  onAddItem,
  availableComponents,
  onCancel,
  showAllButton,
}: DefaultItemsProps) => {
  const layouts = useFormLayouts();
  const { t } = useTranslation(['translation', 'addComponentModal']);

  return (
    <div className={classes.root}>
      <div className={classes.closeButtonContainer}>
        <StudioHeading level={4} size='xxsmall' className={classes.header}>
          {t('select_component_header', { ns: 'addComponentModal' })}
        </StudioHeading>
        <StudioButton icon={<XMarkIcon />} onClick={onCancel} variant='tertiary' />
      </div>
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
    </div>
  );
};
