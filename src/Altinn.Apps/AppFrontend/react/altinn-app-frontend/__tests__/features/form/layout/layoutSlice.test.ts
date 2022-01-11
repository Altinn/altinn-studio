import reducer, {
  initialState, FormLayoutActions, ILayoutState
 } from 'src/features/form/layout/formLayoutSlice';

describe('features > form > layout > layoutSlice.ts', () => {
  describe('fetchLayoutFulfilled', () => {
    const layouts = {};
    const navigationConfig = {};

    it('should set layout state accordingly', () => {
      const nextState = reducer(initialState, FormLayoutActions.fetchLayoutFulfilled({ 
        layouts,
        navigationConfig
      }));

      expect(nextState.layouts).toEqual(layouts);
      expect(nextState.uiConfig.layoutOrder).toEqual(Object.keys(layouts));
      expect(nextState.uiConfig.navigationConfig).toEqual(navigationConfig);
    });

    it('should reset repeatingGroups if set', () => {
      const stateWithRepGroups: ILayoutState = {
        ...initialState,
        uiConfig: {
          ...initialState.uiConfig,
          repeatingGroups: {
            someId: {
              count: 2
            },
          },
        },
      };
      const nextState = reducer(stateWithRepGroups, FormLayoutActions.fetchLayoutFulfilled({
        layouts,
        navigationConfig,
      }));
      
      expect(nextState.uiConfig.repeatingGroups).toEqual({});
    });

    it('should reset error if set', () => {
      const stateWithError: ILayoutState = {
        ...initialState,
        error: new Error('mock'),
      };
      const nextState = reducer(stateWithError, FormLayoutActions.fetchLayoutFulfilled({
        layouts,
        navigationConfig,
      }));

      expect(nextState.error).toEqual(null);
    });

  })
});
