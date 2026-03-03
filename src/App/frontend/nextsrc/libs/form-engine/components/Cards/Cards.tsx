import React from 'react';
import type { CSSProperties } from 'react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import classes from 'nextsrc/libs/form-engine/components/Cards/Cards.module.css';
import { findComponentById } from 'nextsrc/libs/form-engine/utils/findComponent';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompCardsExternal } from 'src/layout/Cards/config.generated';

function parseSize(size: string | undefined, defaultValue: string): string {
  return size && /^[0-9]+$/.test(size) ? `${size}px` : (size ?? defaultValue);
}

export const Cards = ({ component, renderChildren }: ComponentProps) => {
  const props = component as CompCardsExternal;
  const { langAsString } = useLanguage();
  const client = useFormClient();

  const processedMinWidth = parseSize(props.minWidth, '250px');
  const processedMinMediaHeight = parseSize(props.minMediaHeight, '150px');
  const mediaPosition = props.mediaPosition ?? 'top';

  const cardContainer: CSSProperties = {
    display: 'grid',
    gap: '28px',
    gridTemplateColumns: `repeat(auto-fit, minmax(${processedMinWidth}, 1fr))`,
  };

  return (
    <div style={cardContainer}>
      {props.cards.map((card, idx) => {
        const mediaComp = card.media ? findComponentById(client, card.media) : undefined;
        const childComps = (card.children ?? [])
          .map((childId) => findComponentById(client, childId))
          .filter((c): c is NonNullable<typeof c> => c != null);

        const titleText = card.title ? langAsString(card.title) : undefined;
        const descriptionText = card.description ? langAsString(card.description) : undefined;
        const footerText = card.footer ? langAsString(card.footer) : undefined;

        const mediaElement = mediaComp ? (
          <div
            className={classes.cardMedia}
            style={{ minHeight: processedMinMediaHeight }}
          >
            {renderChildren([mediaComp])}
          </div>
        ) : null;

        return (
          <div
            key={idx}
            className={classes.card}
          >
            {mediaPosition === 'top' && mediaElement}
            <div className={classes.cardBody}>
              {titleText && <div className={classes.cardTitle}>{titleText}</div>}
              {descriptionText && <div className={classes.cardDescription}>{descriptionText}</div>}
              {childComps.length > 0 && renderChildren(childComps)}
            </div>
            {footerText && <div className={classes.cardFooter}>{footerText}</div>}
            {mediaPosition === 'bottom' && mediaElement}
          </div>
        );
      })}
    </div>
  );
};
