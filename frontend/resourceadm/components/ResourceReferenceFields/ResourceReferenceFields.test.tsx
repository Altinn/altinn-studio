import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { ResourceReference } from 'app-shared/types/ResourceAdm';
import { ResourceReferenceFields, ResourceReferenceFieldsProps } from './ResourceReferenceFields';

const mockReference1: ResourceReference = {
  referenceSource: 'Default',
  reference: 'ref1',
  referenceType: 'Default',
};

const mockReferenceList: ResourceReference[] = [mockReference1];
const mockReferenceInput = 'hei';
const user = userEvent.setup();

describe('ResourceReferenceFields', () => {
  const mockOnResourceReferenceFieldChanged = jest.fn();

  const defaultProps: ResourceReferenceFieldsProps = {
    resourceReferenceList: mockReferenceList,
    onResourceReferenceFieldChanged: mockOnResourceReferenceFieldChanged,
    onFocus: jest.fn(),
    showErrors: false,
  };

  it('should handle undefined reference list correctly', () => {
    render(<ResourceReferenceFields {...defaultProps} resourceReferenceList={undefined} />);

    const referenceField = screen.getByLabelText(textMock('resourceadm.about_resource_reference'));
    const radioFields = screen.getAllByLabelText('Default');

    expect(referenceField).toHaveValue('');
    expect(radioFields[0]).toBeChecked();
    expect(radioFields[1]).toBeChecked();
  });

  it('should set value of reference field', async () => {
    render(<ResourceReferenceFields {...defaultProps} />);

    const referenceField = screen.getByLabelText(textMock('resourceadm.about_resource_reference'));
    await act(() => user.type(referenceField, mockReferenceInput));

    expect(referenceField).toHaveValue(`${mockReference1.reference}${mockReferenceInput}`);
  });

  it('should set value of reference source field', async () => {
    render(<ResourceReferenceFields {...defaultProps} />);

    const sourceOption = screen.getByLabelText('Altinn3');

    expect(sourceOption).not.toBeChecked();

    await act(() => user.click(sourceOption));

    expect(sourceOption).toBeChecked();
  });

  it('should set value of reference type field', async () => {
    render(<ResourceReferenceFields {...defaultProps} />);

    const typeOption = screen.getByLabelText('MaskinportenScope');

    expect(typeOption).not.toBeChecked();

    await act(() => user.click(typeOption));

    expect(typeOption).toBeChecked();
  });

  it('should save reference value when field is changed', async () => {
    render(<ResourceReferenceFields {...defaultProps} />);

    const referenceField = screen.getByLabelText(textMock('resourceadm.about_resource_reference'));
    await act(() => user.type(referenceField, mockReferenceInput));
    await act(() => referenceField.blur());

    expect(mockOnResourceReferenceFieldChanged).toHaveBeenCalledWith([
      {
        ...mockReference1,
        reference: `${mockReference1.reference}${mockReferenceInput}`,
      },
    ]);
  });

  it('should save reference type value when field is changed', async () => {
    render(<ResourceReferenceFields {...defaultProps} />);

    const typeOption = screen.getByLabelText('ServiceEditionCode');
    await act(() => user.click(typeOption));
    await act(() => typeOption.blur());

    expect(mockOnResourceReferenceFieldChanged).toHaveBeenCalledWith([
      {
        ...mockReference1,
        referenceType: 'ServiceEditionCode',
      },
    ]);
  });

  it('should save reference source value when field is changed', async () => {
    render(<ResourceReferenceFields {...defaultProps} />);

    const sourceOption = screen.getByLabelText('Altinn3');
    await act(() => user.click(sourceOption));
    await act(() => sourceOption.blur());

    expect(mockOnResourceReferenceFieldChanged).toHaveBeenCalledWith([
      {
        ...mockReference1,
        referenceSource: 'Altinn3',
      },
    ]);
  });
});
