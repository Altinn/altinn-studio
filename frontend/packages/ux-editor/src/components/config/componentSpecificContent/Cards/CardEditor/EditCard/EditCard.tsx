import React from 'react';
import { Textfield, Textarea } from '@digdir/design-system-react';
import type { Card } from '@altinn/ux-editor/components/config/componentSpecificContent/Cards/CardsComponent';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDeleteButton } from '@studio/components';
import { XMarkIcon, UploadIcon } from '@studio/icons';

export interface EditCardProps {
  card: Card;
  onChange: () => void;
  onClose: () => void;
  onDelete: () => void;
}
export const EditCard = ({ card, onChange, onClose, onDelete }: EditCardProps) => {
  const { t } = useTranslation();

  const handleAddMediaReference = () => {};

  return (
    <div>
      <StudioButton
        title={t('ux_editor.cards_component_media_reference_title')}
        icon={<UploadIcon />}
        variant='tertiary'
        color='second'
        size='large'
        onClick={handleAddMediaReference}
      >
        {card.media ? card.media : null}
      </StudioButton>
      <Textfield
        id={card.title}
        label={t('ux_editor.cards_component_title')}
        value={card.title}
        onChange={onChange}
        size='small'
      />

      <Textarea
        id={card.description}
        label={t('ux_editor.cards_component_description')}
        value={card.description}
        onChange={onChange}
        size='small'
      />
      <div>
        <StudioButton
          aria-label={t('general.close_item', {
            item: card.title,
          })}
          size='small'
          variant='secondary'
          color='first'
          icon={<XMarkIcon />}
          onClick={onClose}
        />
        <StudioDeleteButton
          size='small'
          onDelete={onDelete}
          aria-label={t('general.delete_item', {
            item: card.title,
          })}
        />
      </div>
    </div>
  );
};
