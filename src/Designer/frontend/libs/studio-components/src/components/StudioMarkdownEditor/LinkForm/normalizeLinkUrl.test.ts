import { normalizeLinkUrl } from './normalizeLinkUrl';

describe('normalizeLinkUrl', () => {
  it.each([
    ['https://altinn.no', 'https://altinn.no'],
    ['  https://altinn.no  ', 'https://altinn.no'],
    ['mailto:a@b.no', 'mailto:a@b.no'],
    ['/relative/path', '/relative/path'],
    ['#anchor', '#anchor'],
    ['altinn.no', 'https://altinn.no'],
  ])('Normalizes %p to %p', (input, expected) => {
    expect(normalizeLinkUrl(input)).toBe(expected);
  });

  it.each(['', '   ', 'javascript:alert(1)', 'data:text/html,x'])('Rejects %p', (input) => {
    expect(normalizeLinkUrl(input)).toBeNull();
  });
});
