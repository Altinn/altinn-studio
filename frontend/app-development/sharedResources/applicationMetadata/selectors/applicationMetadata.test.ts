import { makeGetApplicationMetadata } from './applicationMetadataSelector';

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
    const applicationMetadata = makeGetApplicationMetadata(mockState);
    expect(applicationMetadata).toBe(mockApplicationMetadata);
  });
});
