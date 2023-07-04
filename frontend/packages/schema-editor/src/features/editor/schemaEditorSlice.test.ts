import {
  initialState,
  navigateToType,
  reducer,
  setSelectedId,
  setSelectedTab,
  setUiSchema,
} from './schemaEditorSlice';
import type { SchemaState } from '../../types';

describe('SchemaEditorSlice', () => {
  let state: SchemaState;
  beforeEach(() => {
    // setup state
    state = reducer(initialState, setUiSchema({ name: '#/$defs/RA-0678_M' }));
  });

  describe('setSelectedId', () => {
    it('Sets selected ID when it is a definition', () => {
      const nextState = reducer(
        { ...state, selectedEditorTab: 'definitions' },
        setSelectedId({ pointer: '#/$defs/Kommentar2000Restriksjon' })
      );
      expect(nextState.selectedDefinitionNodeId).toEqual('#/$defs/Kommentar2000Restriksjon');
    });

    it('Sets selected ID when it is a property', () => {
      const nextState = reducer(
        { ...state, selectedEditorTab: 'properties' },
        setSelectedId({ pointer: '#/properties/someField' })
      );
      expect(nextState.selectedPropertyNodeId).toEqual('#/properties/someField');
    });
  });

  test('navigateToType', () => {
    const nextState = reducer(
      { ...state, selectedEditorTab: 'properties' },
      navigateToType({ pointer: '#/$defs/someField' })
    );
    expect(nextState.selectedEditorTab).toEqual('definitions');
    expect(nextState.selectedDefinitionNodeId).toEqual('#/$defs/someField');
  });

  test('setSelectedTab', () => {
    const payload: { selectedTab: 'definitions' | 'properties' } = {
      selectedTab: 'definitions',
    };
    const nextState = reducer(
      { ...state, selectedEditorTab: 'properties' },
      setSelectedTab(payload)
    );
    expect(nextState.selectedEditorTab).toEqual('definitions');
  });
});
