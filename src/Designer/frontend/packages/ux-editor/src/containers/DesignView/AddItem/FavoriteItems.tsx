import { useTranslation } from 'react-i18next';
import classes from './FavoriteItems.module.css';
import { StudioHeading, StudioParagraph } from '@studio/components';
import { ComponentButton } from './ComponentButton';
import { getTitleByComponentType } from '@altinn/ux-editor/utils/language';
import { generateComponentId } from '@altinn/ux-editor/utils/generateId';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentPreset } from '@altinn/ux-editor/types/ComponentPreset';
import type { AddedItem } from './types';
import type { IToolbarElement } from '@altinn/ux-editor/types/global';
import { useFormLayouts } from '@altinn/ux-editor/hooks';
import { mapComponentToToolbarElement } from '@altinn/ux-editor/utils/formLayoutUtils';
import { getFormItemConfig } from '@altinn/ux-editor/data/formItemConfig';

type FavoriteItemsProps = {
  favorites: (ComponentType | ComponentPreset)[];
  onAddItem: (item: AddedItem) => void;
};

export const FavoriteItems = ({ onAddItem, favorites = [] }: FavoriteItemsProps) => {
  const { t } = useTranslation();
  const layouts = useFormLayouts();

  const favoriteComponents: IToolbarElement[] = favorites.map((componentType) =>
    mapComponentToToolbarElement(getFormItemConfig(componentType)),
  );

  return (
    <>
      <StudioHeading level={4}>{t('ux_editor.add_item.favorites_header')}</StudioHeading>
      {favoriteComponents.length === 0 ? (
        <StudioParagraph>{t('ux_editor.add_item.no_favorites_message')}</StudioParagraph>
      ) : (
        <div className={classes.componentsWrapper}>
          {favoriteComponents.map((component) => (
            <ComponentButton
              key={component.type}
              tooltipContent={getTitleByComponentType(component.type, t) || component.label}
              selected={false}
              icon={component.icon}
              inline={true}
              onClick={() =>
                onAddItem({
                  componentType: component.type,
                  componentId: generateComponentId(component.type as ComponentType, layouts),
                })
              }
            />
          ))}
        </div>
      )}
    </>
  );
};
