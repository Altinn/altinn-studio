import type { CardConfig } from 'src/layout/Cards/config.generated';
import type { CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';

export function claimCardsChildren<T extends CompTypes>(
  { claimChild, getType, getCapabilities }: ChildClaimerProps<T>,
  cards: CardConfig[] | undefined,
): void {
  for (const card of (cards || []).values()) {
    if (card.media) {
      const type = getType(card.media);
      if (!type) {
        continue;
      }
      const capabilities = getCapabilities(type);
      if (!capabilities.renderInCardsMedia) {
        window.logWarn(
          `Cards component included a component '${card.media}', which ` +
            `is a '${type}' and cannot be rendered as Card media.`,
        );
        continue;
      }
      claimChild(card.media);
    }

    for (const child of card.children?.values() ?? []) {
      const type = getType(child);
      if (!type) {
        continue;
      }
      const capabilities = getCapabilities(type);
      if (!capabilities.renderInCards) {
        window.logWarn(
          `Cards component included a component '${child}', which ` +
            `is a '${type}' and cannot be rendered as a Card child.`,
        );
        continue;
      }
      claimChild(child);
    }
  }
}
