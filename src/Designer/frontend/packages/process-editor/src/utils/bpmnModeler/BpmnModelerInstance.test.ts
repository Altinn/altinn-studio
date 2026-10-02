import { BpmnModelerInstance } from './BpmnModelerInstance';
import { ReadOnlyCommandStack } from './ReadOnlyCommandStack';

describe('BpmnModelerInstance', () => {
  afterEach(() => BpmnModelerInstance.destroyInstance());

  it('registers the read-only command stack in the modeler', () => {
    const modeler = BpmnModelerInstance.getInstance(document.createElement('div'));

    expect(modeler.get('commandStack')).toBeInstanceOf(ReadOnlyCommandStack);
  });
});
