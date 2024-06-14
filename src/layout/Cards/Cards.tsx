import React from 'react';
import type { CSSProperties } from 'react';

import { Card } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { Lang } from 'src/features/language/Lang';
import { CardProvider } from 'src/layout/Cards/CardContext';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CardConfigInternal } from 'src/layout/Cards/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ICardsProps = PropsFromGenericComponent<'Cards'>;

function parseSize(size: string | undefined, defaultValue: string): string {
  return size && /^[0-9]+$/.test(size) ? `${size}px` : size ?? defaultValue;
}

export const Cards = ({ node }: ICardsProps) => {
  const { cardsInternal, minMediaHeight, minWidth, color, mediaPosition: _mediaPosition } = node.item;
  const processedMinWidth = parseSize(minWidth, '250px');
  const processedMinMediaHeight = parseSize(minMediaHeight, '150px');
  const mediaPosition = _mediaPosition ?? 'top';

  const cardContainer: CSSProperties = {
    display: 'grid',
    gap: '28px',
    gridTemplateColumns: `repeat(auto-fit, minmax(${processedMinWidth}, 1fr))`,
  };

  return (
    <div style={cardContainer}>
      {cardsInternal.map((card, idx) => (
        <Card
          key={idx}
          color={color}
          style={{ height: '100%' }}
        >
          {mediaPosition === 'top' && (
            <Media
              card={card}
              node={node}
              minMediaHeight={processedMinMediaHeight}
            />
          )}
          {card.title && (
            <Card.Header>
              <Lang id={card.title} />
            </Card.Header>
          )}
          {card.description && (
            <Card.Content>
              <Lang id={card.description} />
            </Card.Content>
          )}
          {card.childNodes.length > 0 && (
            <Grid
              container={true}
              item={true}
              direction='row'
              spacing={3}
            >
              <Grid
                container={true}
                alignItems='flex-start'
                item={true}
                spacing={3}
              >
                <CardProvider
                  node={node}
                  renderedInMedia={false}
                >
                  {card.childNodes.map((childNode, idx) => (
                    <GenericComponent
                      key={idx}
                      node={childNode}
                    />
                  ))}
                </CardProvider>
              </Grid>
            </Grid>
          )}
          {card.footer && (
            <Card.Footer>
              <Lang id={card.footer} />
            </Card.Footer>
          )}
          {mediaPosition === 'bottom' && (
            <Media
              card={card}
              node={node}
              minMediaHeight={processedMinMediaHeight}
            />
          )}
        </Card>
      ))}
    </div>
  );
};

interface MediaProps {
  card: CardConfigInternal;
  node: LayoutNode<'Cards'>;
  minMediaHeight: string | undefined;
}

function Media({ card, node, minMediaHeight }: MediaProps) {
  if (!card.mediaNode) {
    return null;
  }

  return (
    <Card.Media>
      <CardProvider
        node={node}
        renderedInMedia={true}
        minMediaHeight={minMediaHeight}
      >
        <div
          key={card.mediaNode.item.id}
          data-componentid={card.mediaNode.item.id}
          data-componentbaseid={card.mediaNode.item.baseComponentId || card.mediaNode.item.id}
        >
          <GenericComponent
            node={card.mediaNode}
            overrideDisplay={{
              directRender: true,
            }}
          />
        </div>
      </CardProvider>
    </Card.Media>
  );
}
