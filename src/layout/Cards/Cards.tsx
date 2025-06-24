import React from 'react';
import type { CSSProperties } from 'react';

import { AppCard } from 'src/app-components/Card/Card';
import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import { CardProvider } from 'src/layout/Cards/CardContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type ICardsProps = PropsFromGenericComponent<'Cards'>;

function parseSize(size: string | undefined, defaultValue: string): string {
  return size && /^[0-9]+$/.test(size) ? `${size}px` : (size ?? defaultValue);
}

const colorVariantMap: Record<string, 'tinted' | 'default'> = {
  neutral: 'default',
  subtle: 'tinted',
};

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
          <AppCard
            key={idx}
            title={card.title && <Lang id={card.title} />}
            description={card.description && <Lang id={card.description} />}
            footer={card.footer && <Lang id={card.footer} />}
            variant={colorVariantMap[color]}
            mediaPosition={mediaPosition}
            media={
              card.mediaId && (
                <CardItem
                  key={idx}
                  nodeId={card.mediaId}
                  parentNode={node}
                  isMedia={true}
                  minMediaHeight={processedMinMediaHeight}
                />
              )
            }
          >
            <Flex
              container
              direction='row'
              spacing={6}
              item
            >
              <Flex
                container
                alignItems='flex-start'
                spacing={6}
                item
              >
                {card?.childIds &&
                  card.childIds?.length > 0 &&
                  card.childIds?.filter(typedBoolean).map((childId, idx) => (
                    <CardItem
                      key={idx}
                      nodeId={childId}
                      parentNode={node}
                      isMedia={false}
                    />
                  ))}
              </Flex>
            </Flex>
          </AppCard>
        ))}
      </div>
    </ComponentStructureWrapper>
  );
};

type CardItemProps = {
  nodeId: string;
  parentNode: LayoutNode<'Cards'>;
  isMedia: boolean;
  minMediaHeight?: string;
};

function CardItem({ nodeId, parentNode, isMedia, minMediaHeight }: CardItemProps) {
  const itemNode = useNode(nodeId);
  if (!itemNode) {
    return null;
  }

  return (
    <CardProvider
      node={parentNode}
      renderedInMedia={isMedia}
      minMediaHeight={minMediaHeight}
    >
      {isMedia ? (
        <div
          data-componentid={nodeId}
          data-componentbaseid={itemNode.baseId}
        >
          <GenericComponent
            node={itemNode}
            overrideDisplay={{
              directRender: true,
            }}
          />
        </div>
      ) : (
        <GenericComponent node={itemNode} />
      )}
    </CardProvider>
  );
}
