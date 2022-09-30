import { screen } from '@testing-library/react';
import React from 'react';
import { IPropertyItemProps, PropertyItem } from './PropertyItem';
import { renderWithRedux } from '../../../test/renderWithRedux';

const renderPropertyItem = (props?: Partial<IPropertyItemProps>) => renderWithRedux(
  <PropertyItem
    fullPath='test'
    language={{required: 'Required', delete_field: 'Delete'}}
    onChangeValue={jest.fn}
    value='test'
    {...props}
  />
);

test('"Required" checkbox is not checked by default', () => {
  renderPropertyItem();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('"Required" checkbox is checked when "required" prop is true', () => {
  renderPropertyItem({required: true});
  expect(screen.getByRole('checkbox')).toBeChecked();
});

test('"Required" checkbox is not checked when "required" prop is false', () => {
  renderPropertyItem({required: false});
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});
