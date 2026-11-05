import { getReturnRoute } from 'src/features/navigation/returnRoute';

describe('getReturnRoute', () => {
  it('captures only the visible route between the edited and return pages', () => {
    const order = ['before', 'details', 'extra', 'summary', 'after'];
    expect(getReturnRoute(order, 'details', 'summary')).toEqual(['details', 'extra', 'summary']);
    expect(getReturnRoute(order, 'summary', 'details')).toEqual(['details', 'extra', 'summary']);
  });

  it('does not change when pages outside the return route appear or disappear', () => {
    expect(getReturnRoute(['before', 'details', 'summary', 'after'], 'details', 'summary')).toEqual(
      getReturnRoute(['details', 'summary'], 'details', 'summary'),
    );
  });

  it('changes when an intervening page appears', () => {
    expect(getReturnRoute(['details', 'extra', 'summary'], 'details', 'summary')).not.toEqual(
      getReturnRoute(['details', 'summary'], 'details', 'summary'),
    );
  });

  it('invalidates the route when an endpoint becomes hidden or leaves the page order', () => {
    expect(getReturnRoute(['details', 'extra'], 'details', 'summary')).toBeUndefined();
    expect(getReturnRoute(['extra', 'summary'], 'details', 'summary')).toBeUndefined();
  });
});
