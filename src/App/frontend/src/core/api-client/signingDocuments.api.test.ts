import { signingApi } from 'src/core/api-client/signing.api';
import { httpGet } from 'src/utils/network/sharedNetworking';
vi.mock('src/utils/network/sharedNetworking');
describe('fetchSigningDocuments', () => {
  const response = {
    dataElements: [
      {
        id: '1',
        dataType: 'attachment',
        contentType: 'application/pdf',
        filename: 'zeta.pdf',
        size: 100,
        tags: ['tag-a'],
        selfLinks: {
          apps: 'https://storage.example.com/zeta.pdf',
        },
      },
      {
        id: '2',
        dataType: 'attachment',
        contentType: 'application/pdf',
        filename: 'alpha.pdf',
        size: 200,
        tags: ['tag-b'],
        selfLinks: {
          apps: 'https://storage.example.com/alpha.pdf',
        },
      },
    ],
  };

  it('preserves backend order', async () => {
    vi.mocked(httpGet).mockResolvedValue(response);
    const documents = await signingApi.fetchSigningDocuments('party-id', 'instance-guid');
    expect(documents.map((doc) => doc.filename)).toEqual(['zeta.pdf', 'alpha.pdf']);
  });
});
