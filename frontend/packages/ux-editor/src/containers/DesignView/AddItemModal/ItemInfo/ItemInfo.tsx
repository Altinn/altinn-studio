import React from 'react';
import {
  StudioHeading,
  StudioIconTextfield,
  StudioParagraph,
  StudioRecommendedNextAction,
} from '@studio/components';
import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../../../utils/language';
import type { AddedItem } from '../types';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import classes from './ItemInfo.module.css';

export type ItemInfoProps = {
  item: AddedItem | null;
  onAddItem: (item: AddedItem) => void;
  onCancel: () => void;
  setItem: (item: AddedItem | null) => void;
  generateComponentId: (type: string) => string;
};

export const ItemInfo = ({
  item,
  onAddItem,
  onCancel,
  setItem,
  generateComponentId,
}: ItemInfoProps) => {
  const { t } = useTranslation();
  return (
    <div className={classes.root}>
      <StudioHeading level={2} size='medium' spacing>
        {!item && t('ux_editor.component_add_item.info_heading')}
        {item && getComponentTitleByComponentType(item.componentType, t)}
      </StudioHeading>
      {!item && <p>{t('ux_editor.component_add_item.info_no_component_selected')}</p>}
      {item && (
        <div>
          <StudioParagraph className={classes.componentHelpText} spacing size='small'>
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
          title={`Legg til ${getComponentTitleByComponentType(item.componentType, t)}`}
          description='Vi lager automatisk en unik ID for komponenten. Du kan endre den her til noe du selv ønsker, eller la den være som den er. Du kan også endre denne id-en senere.'
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
