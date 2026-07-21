import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { StudioButton } from '@studio/components';
import { PlusIcon, XMarkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { DefaultItems } from './DefaultItems';
import { AddItemModal } from './AddItemModal';
import type { AddedItem } from './types';
import type { IInternalLayout } from '../../../types/global';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import classes from './AddItem.module.css';
import { useAddComponentHandlerWithCallback } from './hooks/useAddComponentHandlerWithCallback';
import { useAddComponentHandlerSilent } from './hooks/useAddComponentHandlerSilent';
import { useConfigurationMode } from '../../../hooks';
import { getAvailableFavorites, getComponentSelection } from './AddItemUtils';
import { FavoriteItems } from './FavoriteItems';
import { useFavoriteComponents } from './hooks/useFavoriteComponents';

export type AddItemProps = {
  containerId: string;
  layout: IInternalLayout;
};
export const AddItem = ({ containerId, layout }: AddItemProps): ReactElement => {
  const [showDefault, setShowDefault] = useState(false);
  const { t } = useTranslation(['translation', 'addComponentModal']);
  const { addItem } = useAddComponentHandlerSilent(layout);

  const handleAdd = (item: AddedItem) => {
    addItem(item.componentType, containerId, layout.order[containerId].length, item.componentId);
  };

  return (
    <TemplateContainer containerId={containerId}>
      {!showDefault ? (
        <StudioButton
          icon={<PlusIcon />}
          onClick={() => setShowDefault(true)}
          variant='tertiary'
          fullWidth={containerId === BASE_CONTAINER_ID}
        >
          {t('ux_editor.add_item.add_component')}
        </StudioButton>
      ) : (
        <DefaultItemButtons
          layout={layout}
          containerId={containerId}
          onAddComponent={handleAdd}
          onCancel={() => setShowDefault(false)}
        />
      )}
    </TemplateContainer>
  );
};

export type InlineItemAdderProps = {
  containerId: string;
  layout: IInternalLayout;
  toggleIsOpen: () => void;
  saveAtIndexPosition: number;
};

export const InlineItemAdder = ({
  containerId,
  layout,
  toggleIsOpen,
  saveAtIndexPosition,
}: InlineItemAdderProps): ReactElement => {
  const { addItem } = useAddComponentHandlerWithCallback(layout, toggleIsOpen);

  const handleAdd = (item: AddedItem) => {
    addItem(item.componentType, containerId, saveAtIndexPosition, item.componentId);
  };

  return (
    <TemplateContainer containerId={containerId}>
      <DefaultItemButtons
        layout={layout}
        containerId={containerId}
        onAddComponent={handleAdd}
        onCancel={toggleIsOpen}
      />
    </TemplateContainer>
  );
};

const TemplateContainer = ({
  containerId,
  children,
}: {
  containerId: string;
  children: React.ReactNode;
}) => (
  <div className={cn(classes.root, { [classes.center]: containerId === BASE_CONTAINER_ID })}>
    {children}
  </div>
);

const DefaultItemButtons = ({
  layout,
  containerId,
  onAddComponent,
  onCancel,
}: {
  layout: IInternalLayout;
  containerId: string;
  onAddComponent: (item: AddedItem) => void;
  onCancel: () => void;
}) => {
  const { favorites, isFavorite, toggleFavorite } = useFavoriteComponents();
  const { t } = useTranslation(['translation', 'addComponentModal']);
  const configurationMode = useConfigurationMode();
  const { quickAddComponents, availableComponents, shouldShowAllComponentsButton } =
    getComponentSelection(layout, containerId, configurationMode);

  const availableFavorites = getAvailableFavorites(availableComponents, favorites);

  return (
    <div className={classes.addItemButtons}>
      <StudioButton
        icon={<XMarkIcon title={t('general.close')} />}
        onClick={onCancel}
        variant='tertiary'
        className={classes.closeButton}
      />
      {shouldShowAllComponentsButton && (
        <FavoriteItems onAddItem={onAddComponent} favorites={availableFavorites} />
      )}
      <DefaultItems
        onAddItem={onAddComponent}
        availableComponents={quickAddComponents}
        showAllButton={
          shouldShowAllComponentsButton && (
            <AddItemModal
              onAddComponent={onAddComponent}
              availableComponents={availableComponents}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
            />
          )
        }
      />
    </div>
  );
};
