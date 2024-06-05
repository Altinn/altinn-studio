import type { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { mapAltinn2LinkServiceToSelectOption } from './mapperUtils';

describe('mapperUtils', () => {
  describe('mapAltinn2LinkServiceToSelectOption', () => {
    const mockLinkServices: Altinn2LinkService[] = [
      {
        serviceOwnerCode: 'ttd',
        externalServiceCode: 'code1',
        externalServiceEditionCode: 'edition1',
        serviceName: 'name1',
      },
      {
        serviceOwnerCode: 'acn',
        externalServiceCode: 'code2',
        externalServiceEditionCode: 'edition2',
        serviceName: 'name2',
      },
    ];

    it('should map and sort Altinn2LinkService to SelectOption correctly', () => {
      const result = mapAltinn2LinkServiceToSelectOption(mockLinkServices);

      expect(result).toHaveLength(mockLinkServices.length);
      expect(result[0].value).toBe(JSON.stringify(mockLinkServices[1]));
      expect(result[0].label).toBe('acn: code2-edition2-name2');
    });
  });
});
