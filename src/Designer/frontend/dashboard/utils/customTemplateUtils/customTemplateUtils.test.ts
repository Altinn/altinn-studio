import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import { groupTemplatesByOwner } from './customTemplateUtils';
import type { Organization } from 'app-shared/types/Organization';

describe('customTemplateUtils', () => {
  describe('groupTemplatesByOwner', () => {
    it('should group templates by owner name', () => {
      const templates: CustomTemplate[] = [
        { id: '1', name: 'Template 1', description: 'Desc 1', owner: 'user1' },
        { id: '2', name: 'Template 2', description: 'Desc 2', owner: 'user2' },
        { id: '3', name: 'Template 3', description: 'Desc 3', owner: 'user1' },
      ];
      const organizations: Organization[] = [
        { id: 1, full_name: 'Organization 1', username: 'user1', avatar_url: '' },
        { id: 2, full_name: 'Organization 2', username: 'user2', avatar_url: '' },
      ];

      const grouped = groupTemplatesByOwner(templates, organizations);
      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['Organization 1']).toHaveLength(2);
      expect(grouped['Organization 2']).toHaveLength(1);
    });

    it('should use owner username if organization name is not found', () => {
      const templates: CustomTemplate[] = [
        { id: '1', name: 'Template 1', description: 'Desc 1', owner: 'user1' },
        { id: '2', name: 'Template 2', description: 'Desc 2', owner: 'user3' },
      ];
      const organizations: Organization[] = [
        { id: 1, full_name: 'Organization 1', username: 'user1', avatar_url: '' },
      ];

      const grouped = groupTemplatesByOwner(templates, organizations);
      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['Organization 1']).toHaveLength(1);
      expect(grouped['user3']).toHaveLength(1);
    });
  });
});
