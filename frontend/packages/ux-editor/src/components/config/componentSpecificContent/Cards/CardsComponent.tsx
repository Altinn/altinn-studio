import React from 'react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { StudioProperty } from '@studio/components';
import { Heading } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { CardEditor } from './CardEditor/CardEditor';

export type Card = {
  title: string;
  description: string;
  media?: string;
  children?: string[];
};

export const CardsComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Cards>) => {
  const { t } = useTranslation();

  const handleAddCard = () => {
    component.cards.push({
      title: 'test title',
      description: 'test description',
    });
    handleComponentChange(component);
  };

  // newCard can be sent instead of all props in card
  const handleCardChange = (
    currentCard: Card,
    title?: string,
    description?: string,
    media?: string,
    children?: string[],
  ) => {
    const copyCards = { ...component.cards };
    const copyCard = { ...currentCard };
    const cardIndex = component.cards.indexOf(currentCard);
    if (title) copyCard.title = title;
    if (description) copyCard.description = description;
    if (media) copyCard.media = media;
    if (children) copyCard.children = children;
    copyCards[cardIndex] = copyCard;
    handleComponentChange({ ...component, cards: copyCards });
  };

  const handleCardDelete = (currentCard: Card) => {
    const copyCards = { ...component.cards };
    const cardIndex = component.cards.indexOf(currentCard);
    copyCards.splice(cardIndex);
    handleComponentChange({ ...component, cards: copyCards });
  };

  return (
    <div>
      <Heading size='small'>{t('ux_editor.cards_component_cards_prop_title')}</Heading>
      {component.cards?.map((card, index) => (
        <CardEditor
          key={card.title}
          card={card}
          cardIndex={index}
          onCardChange={() => handleCardChange(card)}
          onCardDelete={() => handleCardDelete(card)}
        />
      ))}
      <StudioProperty.Button
        onClick={handleAddCard}
        property={t('ux_editor.cards_component_add_card')}
        size='small'
      />
    </div>
  );
};
