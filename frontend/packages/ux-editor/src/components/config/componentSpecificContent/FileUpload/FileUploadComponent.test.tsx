import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { IFormFileUploaderComponent } from '../../../../types/global';
import { renderWithMockStore } from '../../../../testing/mocks';
import { FileUploadComponent } from './FileUploadComponent';
import { ComponentTypes } from '../../../index';

// Test data:
const component: IFormFileUploaderComponent = {
  description: 'Lorem ipsum dolor sit amet',
  displayMode: 'test',
  hasCustomFileEndings: false,
  id: '1',
  maxFileSizeInMB: 10,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 0,
  onClickAction: jest.fn(),
  type: ComponentTypes.FileUpload,
};
const handleComponentChange = jest.fn();
const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

describe('FileUploadComponent', () => {
  it('Renders without errors', () => {
    render();
  });
});

const render = (props?: Partial<IGenericEditComponent>) =>
  renderWithMockStore()(<FileUploadComponent {...defaultProps} {...props} />);

