import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { ResourceReference } from 'app-shared/types/ResourceAdm';
import type { ResourceReferenceFieldsProps } from './ResourceReferenceFields';
import { ResourceReferenceFields } from './ResourceReferenceFields';

const mockReference1: ResourceReference = {
  referenceSource: 'Default',
  reference: 'ref1',
  referenceType: 'Default',
};

const mockReferenceList: ResourceReference[] = [mockReference1];
const mockReferenceInput = 'hei';

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
    const typeField = screen.getByLabelText(textMock('resourceadm.about_resource_reference_type'));
    const sourceField = screen.getByLabelText(
      textMock('resourceadm.about_resource_reference_source'),
    );

    expect(referenceField).toHaveValue('');
    expect(typeField).toHaveValue('Default');
    expect(sourceField).toHaveValue('Default');
  });

  it('should set value of reference field', async () => {
    const user = userEvent.setup();
    render(<ResourceReferenceFields {...defaultProps} />);

    const referenceField = screen.getByLabelText(textMock('resourceadm.about_resource_reference'));
    await act(() => user.type(referenceField, mockReferenceInput));

    expect(referenceField).toHaveValue(`${mockReference1.reference}${mockReferenceInput}`);
  });

  it('should set value of reference source field', async () => {
    const user = userEvent.setup();
    render(<ResourceReferenceFields {...defaultProps} />);

    const sourceField = screen.getByLabelText(
      textMock('resourceadm.about_resource_reference_source'),
    );

    expect(sourceField).toHaveValue('Default');

    await act(() => user.selectOptions(sourceField, 'Altinn3'));

    expect(sourceField).toHaveValue('Altinn3');
  });

  it('should set value of reference type field', async () => {
    const user = userEvent.setup();
    render(<ResourceReferenceFields {...defaultProps} />);

    const typeField = screen.getByLabelText(textMock('resourceadm.about_resource_reference_type'));

    expect(typeField).toHaveValue('Default');

    await act(() => user.selectOptions(typeField, 'MaskinportenScope'));

    expect(typeField).toHaveValue('MaskinportenScope');
  });

  it('should save reference value when field is changed', async () => {
    const user = userEvent.setup();
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
    const user = userEvent.setup();
    render(<ResourceReferenceFields {...defaultProps} />);

    const typeField = screen.getByLabelText(textMock('resourceadm.about_resource_reference_type'));
    await act(() => user.selectOptions(typeField, 'ServiceEditionCode'));
    await act(() => typeField.blur());

    expect(mockOnResourceReferenceFieldChanged).toHaveBeenCalledWith([
      {
        ...mockReference1,
        referenceType: 'ServiceEditionCode',
      },
    ]);
  });

  it('should save reference source value when field is changed', async () => {
    const user = userEvent.setup();
    render(<ResourceReferenceFields {...defaultProps} />);

    const sourceField = screen.getByLabelText(
      textMock('resourceadm.about_resource_reference_source'),
    );
    await act(() => user.selectOptions(sourceField, 'Altinn3'));
    await act(() => sourceField.blur());

    expect(mockOnResourceReferenceFieldChanged).toHaveBeenCalledWith([
      {
        ...mockReference1,
        referenceSource: 'Altinn3',
      },
    ]);
  });
});
