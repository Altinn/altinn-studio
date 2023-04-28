import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getProcessStateMock } from 'src/__mocks__/processMock';
import {
  appMetaDataSelector,
  currentSelectedPartyIdSelector,
  instanceDataSelector,
  layoutSetsSelector,
  processStateSelector,
  profileStateSelector,
} from 'src/selectors/simpleSelectors';

describe('simpleSelectors', () => {
  const state = getInitialStateMock({
    process: getProcessStateMock({
      taskId: 'Task1',
    }),
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

  it('should fetch process state', () => {
    const process = processStateSelector(state);
    expect(process.taskId).toBe('Task1');
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

  it('should fetch profile', () => {
    const profile = profileStateSelector(state);
    expect(profile.partyId).toBe(12345);
  });
});
