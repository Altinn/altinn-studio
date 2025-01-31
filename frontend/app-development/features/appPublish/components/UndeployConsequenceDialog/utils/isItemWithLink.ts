import type { Item, ItemWithLink } from '../consequences.data';

export function isItemWithLink(item: Item | ItemWithLink): item is ItemWithLink {
  return 'link' in item;
}
