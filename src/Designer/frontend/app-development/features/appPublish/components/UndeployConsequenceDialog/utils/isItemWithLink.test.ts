import type { Item, ItemWithLink } from '../consequences.data';
import { isItemWithLink } from './isItemWithLink';

describe('isItemWithLink', () => {
  it('should return true if item has a link property', () => {
    const itemWithLink: ItemWithLink = { textKey: 'simple-key', link: 'https://example.com' };
    expect(isItemWithLink(itemWithLink)).toBe(true);
  });

  it('should return false if item does not have a link property', () => {
    const itemWithoutLink: Item = { textKey: 'simple-key' };
    expect(isItemWithLink(itemWithoutLink)).toBe(false);
  });
});
