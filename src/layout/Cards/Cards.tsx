import React from 'react';
import type { CSSProperties } from 'react';

import { Card } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { Lang } from 'src/features/language/Lang';
import { CardProvider } from 'src/layout/Cards/CardContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CardInternal } from 'src/layout/Cards/CardsPlugin';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ICardsProps = PropsFromGenericComponent<'Cards'>;

function parseSize(size: string | undefined, defaultValue: string): string {
  return size && /^[0-9]+$/.test(size) ? `${size}px` : (size ?? defaultValue);
}

export const Cards = ({ node }: ICardsProps) => {
  const { cardsInternal, minMediaHeight, minWidth, color, mediaPosition: _mediaPosition } = useNodeItem(node);
  const processedMinWidth = parseSize(minWidth, '250px');
  const processedMinMediaHeight = parseSize(minMediaHeight, '150px');
  const mediaPosition = _mediaPosition ?? 'top';

  const cardContainer: CSSProperties = {
    display: 'grid',
    gap: '28px',
    gridTemplateColumns: `repeat(auto-fit, minmax(${processedMinWidth}, 1fr))`,
  };

  return (
    <ComponentStructureWrapper node={node}>
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
            {card.children && card.children.length > 0 && (
              <Grid
                container={true}
                item={true}
                direction='row'
                spacing={6}
              >
                <Grid
                  container={true}
                  alignItems='flex-start'
                  item={true}
                  spacing={6}
                >
                  <CardProvider
                    node={node}
                    renderedInMedia={false}
                  >
                    {card.children.filter(typedBoolean).map((childNode, idx) => (
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
    </ComponentStructureWrapper>
  );
};

interface MediaProps {
  card: CardInternal;
  node: LayoutNode<'Cards'>;
  minMediaHeight: string | undefined;
}

function Media({ card, node, minMediaHeight }: MediaProps) {
  if (!card.media) {
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
          data-componentid={card.media.id}
          data-componentbaseid={card.media.baseId}
        >
          <GenericComponent
            node={card.media}
            overrideDisplay={{
              directRender: true,
            }}
          />
        </div>
      </CardProvider>
    </Card.Media>
  );
}
