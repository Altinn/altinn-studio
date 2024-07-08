import React, { useState } from 'react';
import { StudioProperty, StudioCard } from '@studio/components';
import type { Card } from '@altinn/ux-editor/components/config/componentSpecificContent/Cards/CardsComponent';
import { useTranslation } from 'react-i18next';
import classes from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/ActionsEditor.module.css';
import { EditCard } from './EditCard/EditCard';

export interface CardProps {
  card: Card;
  cardIndex: number;
  onCardChange: () => void;
  onCardDelete: () => void;
}

export const CardEditor = ({ card, cardIndex, onCardChange, onCardDelete }: CardProps) => {
  const [editCardVisible, setEditCardVisible] = useState<boolean>(false);
  const { t } = useTranslation();

  const cardLabel = t('ux_editor.cards_component_card_label', {
    cardIndex: cardIndex + 1,
  });

  return (
    <>
      {editCardVisible ? (
        <StudioCard key={card.title}>
          <EditCard
            card={card}
            onChange={onCardChange}
            onClose={() => setEditCardVisible(false)}
            onDelete={onCardDelete}
          />
        </StudioCard>
      ) : (
        <StudioProperty.Button
          aria-label={card.title}
          onClick={() => setEditCardVisible(true)}
          property={cardLabel}
          value={card.title}
          className={classes.actionView}
        />
      )}
    </>
  );
};
