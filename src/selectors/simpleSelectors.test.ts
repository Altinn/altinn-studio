import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import {
  appMetaDataSelector,
  currentSelectedPartyIdSelector,
  instanceDataSelector,
  layoutSetsSelector,
} from 'src/selectors/simpleSelectors';

describe('simpleSelectors', () => {
  const state = getInitialStateMock({
    formLayout: {
      ...getFormLayoutStateMock(),
      layoutsets: {
        sets: [
          {
            id: 'layout',
            dataType: 'default',
          },
        ],
      },
    },
  });

  it('should fetch application metadata', () => {
    const appMetadata = appMetaDataSelector(state);
    expect(appMetadata?.id).toBe('mockOrg/test-app');
  });

  it('should fetch instance metadata', () => {
    const instance = instanceDataSelector(state);
    expect(instance?.id).toBe('91cefc5e-c47b-40ff-a8a4-05971205f783');
  });

  it('should fetch selected party id', () => {
    const selectedPartyId = currentSelectedPartyIdSelector(state);
    expect(selectedPartyId).toBe('12345');
  });

  it('should fetch layout sets', () => {
    const layoutSets = layoutSetsSelector(state);
    expect(layoutSets?.sets.length).toBe(1);
    expect(layoutSets?.sets[0].id).toBe('layout');
  });
});
