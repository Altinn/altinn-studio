import { getExistingDatamodelIdFromLayoutsets } from './customReceiptUtils';

describe('customReceiptUtils', () => {
  describe('getExistingDatamodelIdFromLayoutSets', () => {
    const layoutSetId1: string = 'layoutSet1';
    const layoutSetId2: string = 'layoutSet2';
    const layoutSetDataType1: string = 'dataType1';
    const layoutSetDataType2: string = 'dataType2';

    const layoutSets = {
      sets: [
        { id: layoutSetId1, dataType: layoutSetDataType1, tasks: [] },
        { id: layoutSetId2, dataType: layoutSetDataType2, tasks: [] },
      ],
    };

    it('returns existing datamodel id when layout set id matches', () => {
      const existingDatamodelId = getExistingDatamodelIdFromLayoutsets(layoutSets, layoutSetId1);
      expect(existingDatamodelId).toBe(layoutSetDataType1);
    });

    it('returns undefined when layout set id does not match', () => {
      const existingCustomReceiptLayoutSetId = 'nonExistentLayoutSet';
      const existingDatamodelId = getExistingDatamodelIdFromLayoutsets(
        layoutSets,
        existingCustomReceiptLayoutSetId,
      );
      expect(existingDatamodelId).toBeUndefined();
    });
  });
});
