import React from 'react';
import {
  StudioHeading,
  StudioIconTextfield,
  StudioRecommendedNextAction,
} from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import {
  getComponentHelperTextByComponentType,
  getTitleByComponentType,
} from '../../../../../../utils/language';
import type { AddedItem } from '../types';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import classes from './ItemInfo.module.css';

export type ItemInfoProps = {
  item: AddedItem | null;
  onAddItem: (item: AddedItem) => void;
  onCancel: () => void;
  setItem: (item: AddedItem | null) => void;
};

export const ItemInfo = ({ item, onAddItem, onCancel, setItem }: ItemInfoProps) => {
  const { t } = useTranslation(['translation', 'addComponentModal']);
  return (
    <div className={classes.root}>
      <StudioHeading level={2} size='medium' spacing>
        {!item && t('ux_editor.component_add_item.info_heading')}
        {item && getTitleByComponentType(item.componentType, t)}
      </StudioHeading>
      {!item && <p>{t('ux_editor.component_add_item.info_no_component_selected')}</p>}
      {item && (
        <div>
          <StudioParagraph spacing>
            {getComponentHelperTextByComponentType(item.componentType, t)}
          </StudioParagraph>
        </div>
      )}
      {item && (
        <StudioRecommendedNextAction
          onSave={() => {
            onAddItem(item);
            setItem(null);
          }}
          onSkip={() => {
            onCancel();
            setItem(null);
          }}
          saveButtonText='Legg til'
          skipButtonText='Avbryt'
          title={t('ux_editor.add_item.add_component_by_type', {
            type: getTitleByComponentType(item.componentType, t),
          })}
          description={t('ux_editor.add_item.component_info_generated_id_description')}
        >
          <StudioIconTextfield
            icon={<PencilIcon />}
            label={t('Komponent ID')}
            value={item.componentId}
            onChange={(event: any) => {
              setItem({ ...item, componentId: event.target.value });
            }}
          />
        </StudioRecommendedNextAction>
      )}
    </div>
  );
};
