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
  setItem: (item: AddedItem | null) => void;
  generateComponentId: (type: string) => string;
};

export const ItemInfo = ({ item, onAddItem, setItem, generateComponentId }: ItemInfoProps) => {
  const { t } = useTranslation();
  return (
    <>
      <StudioHeading level={2} size='medium' spacing>
        {t('ux_editor.component_add_item.info_heading')}
      </StudioHeading>
      {!item && <p>{t('ux_editor.component_add_item.info_no_component_selected')}</p>}
      {item && (
        <div>
          <p>
            {t('ux_editor.component_add_item.info_component_selected', {
              componentName: getComponentTitleByComponentType(item.componentType, t),
            })}
          </p>
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
            onAddItem({
              ...item,
              componentId: generateComponentId(item.componentType),
            });
            setItem(null);
          }}
          saveButtonText='Legg til med endringer'
          skipButtonText='Bruk standardinnstillinger'
          title={`Legg til ${getComponentTitleByComponentType(item.componentType, t)}`}
          description='Her kan du endre standardinnstillinger for komponenten. Du kan også hoppe over dette og gjøre det senere.'
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
    </>
  );
};
