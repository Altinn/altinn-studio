import 'jest';
import { makeGetApplicationMetadata } from '../../sharedResources/applicationMetadata/selectors/applicationMetadataSelector';

describe('ApplicationMetadata', () => {
  let mockApplicationMetadata: any;
  let mockState: any;

  beforeEach(() => {
    mockApplicationMetadata = {
      mockContent: 'someContent',
      mockNumber: 10,
    };
    mockState = {
      applicationMetadataState: {
        applicationMetadata: mockApplicationMetadata,
        error: null,
      },
    };
  });

  it('applicationMetadataSelector should return correct state', () => {
    const getApplicationMetadata = makeGetApplicationMetadata();
    const applicationMetadata = getApplicationMetadata(mockState);
    expect(applicationMetadata).toBe(mockApplicationMetadata);
  });
});
