import React from 'react';
import { type CustomTemplate } from 'app-shared/types/CustomTemplateReference';

export interface TemplateSelectorProps {
  templates: CustomTemplate[];
  selectedTemplates: CustomTemplate[];
  onChange: (selected: CustomTemplate[]) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplates,
  onChange,
}) => {
  const handleCheckboxChange = (template: CustomTemplate) => {
    if (selectedTemplates.some((t) => t.id === template.id)) {
      onChange(selectedTemplates.filter((t) => t.id !== template.id));
    } else {
      onChange([...selectedTemplates, template]);
    }
  };

  return (
    <div>
      <label style={{ fontWeight: 'bold' }}>Select templates:</label>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {templates.map((template) => (
          <li key={template.id}>
            <label>
              <input
                type='checkbox'
                checked={selectedTemplates.some((t) => t.id === template.id)}
                onChange={() => handleCheckboxChange(template)}
              />
              <span>{template.name.nb ?? Object.values(template.name)[0] ?? template.id}</span>
              {template.description && (
                <div style={{ fontSize: '0.9em', color: '#666', marginLeft: 24 }}>
                  {template.description.nb ?? Object.values(template.description)[0] ?? ''}
                </div>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
};
