import React, { useRef } from 'react';
import { getAvailableChildComponentsForContainer } from '../../../utils/formLayoutUtils';
import type { IInternalLayout, IToolbarElement } from '../../../types/global';
import { StudioButton, StudioModal } from '@studio/components-legacy';
import type { AddedItem } from './types';
import { AddItemContent } from './AddItemContent';
import { PlusIcon } from 'libs/studio-icons/src';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import classes from './AddItemModal.module.css';
import { useTranslation } from 'react-i18next';

export type AddItemModalProps = {
  containerId: string;
  layout: IInternalLayout;
  onAddComponent?: (addedItem: AddedItem) => void;
  availableComponents?: KeyValuePairs<IToolbarElement[]>;
};

export const AddItemModal = ({ containerId, layout, onAddComponent }: AddItemModalProps) => {
  const [selectedItem, setSelectedItem] = React.useState<AddedItem | null>(null);
  const handleCloseModal = () => {
    setSelectedItem(null);
    modalRef.current?.close();
  };

  const modalRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation(['translation', 'addComponentModal']);

  const handleAddComponent = (addedItem: AddedItem) => {
    onAddComponent(addedItem);
    handleCloseModal();
  };

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const availableComponents = getAvailableChildComponentsForContainer(layout, containerId);

  return (
    <StudioModal.Root>
      <StudioButton
        onClick={handleOpenModal}
        variant='primary'
        className={classes.componentButtonInline}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <PlusIcon fontSize='1.5rem' />
          {t('ux_editor.add_item.show_all')}
        </div>
      </StudioButton>
      <StudioModal.Dialog
        onClose={handleCloseModal}
        heading={t('ux_editor.add_item.select_component_header')}
        closeButtonTitle={t('ux_editor.add_item.close')}
        style={{ minWidth: '85vw' }}
        ref={modalRef}
      >
        <AddItemContent
          item={selectedItem}
          setItem={setSelectedItem}
          onAddItem={handleAddComponent}
          onCancel={handleCloseModal}
          availableComponents={availableComponents}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
};
