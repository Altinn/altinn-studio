import { useState, useRef } from 'react';
import type { IToolbarElement } from '../../../types/global';
import { StudioDialog, StudioHeading } from '@studio/components';
import type { AddedItem } from './types';
import { AddItemContent } from './AddItemContent';
import { PlusIcon } from '@studio/icons';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import classes from './AddItemModal.module.css';
import { useTranslation } from 'react-i18next';

export type AddItemModalProps = {
  onAddComponent?: (addedItem: AddedItem) => void;
  availableComponents: KeyValuePairs<IToolbarElement[]>;
  isFavorite: (componentType: AddedItem['componentType']) => boolean;
  toggleFavorite: (componentType: AddedItem['componentType']) => void;
};

export const AddItemModal = ({
  onAddComponent,
  availableComponents,
  isFavorite,
  toggleFavorite,
}: AddItemModalProps) => {
  const [selectedItem, setSelectedItem] = useState<AddedItem | null>(null);
  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  const modalRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation(['translation', 'addComponentModal']);

  const handleAddComponent = (addedItem: AddedItem) => {
    onAddComponent(addedItem);
    modalRef.current?.close();
  };

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger variant='primary' className={classes.componentButtonInline}>
        <div className={classes.triggerContent}>
          <PlusIcon fontSize='1.5rem' />
          {t('ux_editor.add_item.show_all')}
        </div>
      </StudioDialog.Trigger>
      <StudioDialog
        onClose={handleCloseModal}
        style={{ minWidth: '85vw' }}
        ref={modalRef}
        closedby='any'
      >
        <StudioDialog.Block>
          <StudioHeading level={4}>{t('ux_editor.add_item.select_component_header')}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <AddItemContent
            item={selectedItem}
            setItem={setSelectedItem}
            onAddItem={handleAddComponent}
            onCancel={handleCloseModal}
            availableComponents={availableComponents}
            isFavorite={isFavorite}
            toggleFavorite={toggleFavorite}
          />
        </StudioDialog.Block>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
};
