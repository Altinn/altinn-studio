import {
  fetchOptionsFulfilled,
  fetchOptionsRejected,
} from '../../../../../src/shared/resources/options/fetch/fetchOptionsActions';

describe('resources > options > fetch > fetchOptionsActions', () => {
  it('should create an action with correct type: OPTIONS.FETCH_OPTIONS_FULFILLED', () => {
    const expectedAction = {
      type: 'OPTIONS.FETCH_OPTIONS_FULFILLED',
      options: [],
      optionsId: 'options-id',
    };
    expect(fetchOptionsFulfilled('options-id', [])).toEqual(expectedAction);
  });

  it('should create an action with correct type: OPTIONS.FETCH_OPTIONS_REJECTED', () => {
    const mockError: Error = new Error('error message');
    const expectedAction = {
      type: 'OPTIONS.FETCH_OPTIONS_REJECTED',
      error: mockError,
    };
    expect(fetchOptionsRejected(mockError)).toEqual(expectedAction);
  });
});
