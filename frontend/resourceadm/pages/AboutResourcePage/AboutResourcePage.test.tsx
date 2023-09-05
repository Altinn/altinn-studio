import React from 'react';
import { render, screen } from '@testing-library/react';
import { AboutResourcePageProps, AboutResourcePage } from './AboutResourcePage';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import { Resource, ResourceContactPoint, ResourceTypeOption } from 'app-shared/types/ResourceAdm';
import {
  getMissingInputLanguageString,
  mapKeywordsArrayToString,
} from 'resourceadm/utils/resourceUtils/resourceUtils';

const mockContactPoint: ResourceContactPoint = {
  category: 'test',
  email: 'test@test.com',
  telephone: '',
  contactPage: '',
};
const mockResource1: Resource = {
  identifier: 'r1',
  resourceType: 'GenericAccessResource',
  title: { nb: 'ressurs 1', nn: 'res1', en: 'resource 1' },
  description: { nb: 'Beskrivelse av resource 1', nn: 'Mock', en: 'Description of test resource' },
  keywords: [
    { language: 'nb', word: 'Key1 ' },
    { language: 'nb', word: 'Key 2' },
  ],
  visible: false,
  resourceReferences: [{ reference: 'ref', referenceType: 'Default', referenceSource: 'Default' }],
  homepage: '',
  delegable: true,
  rightDescription: { nb: '', nn: '', en: '' },
  status: 'Completed',
  selfIdentifiedUserEnabled: false,
  enterpriseUserEnabled: false,
  availableForType: ['Company'],
  contactPoints: [mockContactPoint],
};
const mockResource2: Resource = {
  identifier: 'r2',
  resourceType: undefined,
  title: { nb: '', nn: '', en: '' },
  description: { nb: '', nn: '', en: '' },
  delegable: true,
  rightDescription: { nb: '', nn: '', en: '' },
};
const mockResourceType: ResourceTypeOption = textMock(
  'resourceadm.about_resource_resource_type_system_resource'
);

const mockNewTitleInput: string = '23';
const mockNewDescriptionInput: string = ' test';
const mockNewHomepageInput: string = 'google.com';
const mockNewKeyboardInput: string = ', key 3';
const mockNewRightDescriptionInput: string = 'mock';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResource1,
  }),
}));

describe('AboutResourcePage', () => {
  const mockOnSaveResource = jest.fn();

  const defaultProps: AboutResourcePageProps = {
    showAllErrors: false,
    resourceData: mockResource1,
    onSaveResource: mockOnSaveResource,
  };

  it('handles resource type change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const [resourceTypeSelect] = screen.getAllByLabelText(
      textMock('resourceadm.about_resource_resource_type')
    );
    await act(() => user.click(resourceTypeSelect));
    await act(() => user.click(screen.getByRole('option', { name: mockResourceType })));

    expect(resourceTypeSelect).toHaveValue(mockResourceType);
  });

  it('handles title input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_title_label')
    );
    expect(titleNbInput).toHaveValue(mockResource1.title.nb);

    await act(() => user.clear(titleNbInput));
    await act(() => user.type(titleNbInput, mockNewTitleInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_resource_title_label'))
    ).toHaveValue(`${mockResource1.title.nb}${mockNewTitleInput}`);
  });

  it('calls onSaveResource when going from one input field to another', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_title_label')
    );
    await act(() => user.type(titleNbInput, mockNewTitleInput));
    expect(mockOnSaveResource).not.toHaveBeenCalled();

    const descriptionNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_description_label')
    );
    await act(() => user.type(descriptionNbInput, mockNewDescriptionInput));
    expect(mockOnSaveResource).toHaveBeenCalled();
  });

  it('handles description input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const descriptionNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_description_label')
    );
    expect(descriptionNbInput).toHaveValue(mockResource1.description.nb);

    await act(() => user.clear(descriptionNbInput));
    await act(() => user.type(descriptionNbInput, mockNewDescriptionInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_resource_description_label'))
    ).toHaveValue(`${mockResource1.description.nb}${mockNewDescriptionInput}`);
  });

  it('handles homepage input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const homepageInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_homepage_label')
    );
    expect(homepageInput).toHaveValue(mockResource1.homepage);

    await act(() => user.clear(homepageInput));
    await act(() => user.type(homepageInput, mockNewHomepageInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_homepage_label'))
    ).toHaveValue(`${mockResource1.homepage}${mockNewHomepageInput}`);
  });

  it('handles keyword input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const keywordInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_keywords_label')
    );
    const keywordString: string = mapKeywordsArrayToString(mockResource1.keywords);
    expect(keywordInput).toHaveValue(keywordString);

    await act(() => user.type(keywordInput, mockNewKeyboardInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_keywords_label'))
    ).toHaveValue(`${keywordString}${mockNewKeyboardInput}`);
  });

  it('handles rights description input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const rightDescriptionInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_rights_description_label')
    );
    expect(rightDescriptionInput).toHaveValue(mockResource1.rightDescription.nb);

    await act(() => user.clear(rightDescriptionInput));
    await act(() => user.type(rightDescriptionInput, mockNewRightDescriptionInput));

    expect(
      screen.getByLabelText(textMock('resourceadm.about_resource_rights_description_label'))
    ).toHaveValue(`${mockResource1.rightDescription.nb}${mockNewRightDescriptionInput}`);
  });

  it('displays errors for the required translation fields when showAllErrors are true', () => {
    render(<AboutResourcePage {...defaultProps} showAllErrors resourceData={mockResource2} />);

    expect(
      screen.getByText(textMock('resourceadm.about_resource_resource_type_error'))
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        getMissingInputLanguageString(
          mockResource2.title,
          textMock('resourceadm.about_resource_error_usage_string_title'),
          textMock
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        getMissingInputLanguageString(
          mockResource2.description,
          textMock('resourceadm.about_resource_error_usage_string_description'),
          textMock
        )
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        getMissingInputLanguageString(
          mockResource2.rightDescription,
          textMock('resourceadm.about_resource_error_usage_string_rights_description'),
          textMock
        )
      )
    ).toBeInTheDocument();
  });
});
