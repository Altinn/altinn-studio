import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { SchemaSelect, ISchemaSelectProps } from './SchemaSelect';

describe('SchemaSelect', () => {
  const mockOptions = [
    {
      label: 'JSONSchema',
      options: [
        {
          label: 'test123',
          value: {
            fileName: 'test123.schema.json',
            repositoryRelativeUrl: 'model/test123.schema.json',
            fileType: '.json',
          }
        }
      ],
    },
    {
      label: 'XSD',
      options: [
        {
          label: 'my-test-xsd',
          value: {
            fileName: 'my-test-xsd.xsd',
            repositoryRelativeUrl: 'model/my-test-xsd.xsd',
            fileType: '.xsd',
          }
        }
      ],
    },
  ];

  it('should render empty select when there are no provided options', () => {
    const utils = render();
    const selectComponent = utils.getByRole('combobox');
    expect(selectComponent.getAttribute('value')).toBe("");
  });

  it('should not select any item when there are provided options but no selected item provided', async () => {
    const utils = render({ options: mockOptions });
    const selectedOptionText = utils.queryByText('test123');
    expect(selectedOptionText).toBeNull();
  });

  it('should select provided selected item when there are provided options', async () => {
    const utils = render({
      options: mockOptions,
      selectedOption: {
        label: 'test123',
        value: {
          fileName: 'test123.schema.json',
          repositoryRelativeUrl: 'model/test123.schema.json',
          fileType: '.json',
        }
      },
    });
    const selectedOptionText = utils.getByText('test123');
    expect(selectedOptionText).toBeVisible();
  });
});

const render = (props?: Partial<ISchemaSelectProps>) => {
  const defaultProps: ISchemaSelectProps = {
    disabled: false,
    onChange: jest.fn,
    options: [
      {
        label: 'JSONSchema',
        options: [],
      },
      {
        label: 'XSD',
        options: [],
      }
    ],
    selectedOption: null,
  };

  return rtlRender(<SchemaSelect {...defaultProps} {...props}/>);
}
