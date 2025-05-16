import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AboutResourcePageProps } from './AboutResourcePage';
import { AboutResourcePage } from './AboutResourcePage';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type {
  ConsentTemplate,
  Resource,
  ResourceContactPoint,
  ResourceStatusOption,
  ResourceTypeOption,
} from 'app-shared/types/ResourceAdm';
import {
  getMissingInputLanguageString,
  mapKeywordsArrayToString,
  resourceStatusMap,
} from '../../utils/resourceUtils/resourceUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

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
    { language: 'nb', word: 'Key 1' },
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
const mockConsentResource: Resource = {
  ...mockResource1,
  resourceType: 'Consentresource',
  consentText: {
    nb: 'Du samtykker til å dele dine data med {org}',
    nn: 'consentNn',
    en: 'consentEn',
  },
};

const mockResourceType: ResourceTypeOption = textMock(
  'resourceadm.about_resource_resource_type_system_resource',
) as ResourceTypeOption;
const mockStatus: ResourceStatusOption = 'Deprecated';

const mockNewTitleInput: string = '23';
const mockNewDescriptionInput: string = ' test';
const mockNewHomepageInput: string = 'google.com';
const mockNewKeyboardInput: string = ', key 3';
const mockNewRightDescriptionInput: string = 'mock';
const mockNewConsentTextInput: string = ' og andre';
const mockId: string = 'page-content-deploy';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    resourceId: mockResource1,
  }),
}));

describe('AboutResourcePage', () => {
  afterEach(jest.clearAllMocks);

  const mockOnSaveResource = jest.fn();

  const defaultProps: AboutResourcePageProps = {
    validationErrors: [],
    resourceData: mockResource1,
    onSaveResource: mockOnSaveResource,
    id: mockId,
  };

  it('handles resource id field blur', async () => {
    render(<AboutResourcePage {...defaultProps} />);

    const idInput = screen.getByLabelText(textMock('resourceadm.about_resource_identifier_label'));

    idInput.focus();
    await waitFor(() => idInput.blur());

    expect(mockOnSaveResource).not.toHaveBeenCalled();
  });

  it('handles resource type change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const resourceTypeRadio = screen.getByLabelText(mockResourceType);
    await user.click(resourceTypeRadio);

    expect(resourceTypeRadio).toBeChecked();
  });

  it('handles title input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_title_label'),
      { exact: false },
    );
    expect(titleNbInput).toHaveValue(mockResource1.title.nb);

    await user.type(titleNbInput, mockNewTitleInput);
    await waitFor(() => titleNbInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      title: {
        ...mockResource1.title,
        nb: `${mockResource1.title.nb}${mockNewTitleInput}`,
      },
    });
  });

  it('calls onSaveResource when going from one input field to another', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_title_label'),
      { exact: false },
    );
    await user.type(titleNbInput, mockNewTitleInput);
    expect(mockOnSaveResource).not.toHaveBeenCalled();

    const descriptionNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_description_label'),
      { exact: false },
    );
    await user.type(descriptionNbInput, mockNewDescriptionInput);
    expect(mockOnSaveResource).toHaveBeenCalled();
  });

  it('handles description input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const descriptionNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_description_label'),
      { exact: false },
    );
    expect(descriptionNbInput).toHaveValue(mockResource1.description.nb);

    await user.type(descriptionNbInput, mockNewDescriptionInput);
    await waitFor(() => descriptionNbInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      description: {
        ...mockResource1.description,
        nb: `${mockResource1.description.nb}${mockNewDescriptionInput}`,
      },
    });
  });

  it('handles homepage input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const homepageInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_homepage_label'),
    );
    expect(homepageInput).toHaveValue(mockResource1.homepage);

    await user.clear(homepageInput);
    await user.type(homepageInput, mockNewHomepageInput);
    await waitFor(() => homepageInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      homepage: mockNewHomepageInput,
    });
  });

  it('handles delegable switch changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const delegableInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_delegable_label'),
    );
    expect(delegableInput).toBeChecked();

    await user.click(delegableInput);

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      delegable: false,
    });
  });

  it('handles keyword input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const keywordInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_keywords_label'),
    );
    const keywordString: string = mapKeywordsArrayToString(mockResource1.keywords);
    expect(keywordInput).toHaveValue(keywordString);

    await user.type(keywordInput, mockNewKeyboardInput);
    await waitFor(() => keywordInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      keywords: [...mockResource1.keywords, { language: 'nb', word: 'key 3' }],
    });
  });

  it('handles rights description input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const rightDescriptionInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_rights_description_label'),
      { exact: false },
    );
    expect(rightDescriptionInput).toHaveValue(mockResource1.rightDescription.nb);

    await user.clear(rightDescriptionInput);
    await user.type(rightDescriptionInput, mockNewRightDescriptionInput);
    await waitFor(() => rightDescriptionInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      rightDescription: {
        ...mockResource1.rightDescription,
        nb: `${mockResource1.rightDescription.nb}${mockNewRightDescriptionInput}`,
      },
    });
  });

  it('handles status change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const statusRadio = screen.getByLabelText(textMock(resourceStatusMap[mockStatus]));
    await user.click(statusRadio);

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      status: mockStatus,
    });
  });

  it('handles self identifiable switch changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const input = screen.getByLabelText(
      textMock('resourceadm.about_resource_self_identified_label'),
    );
    expect(input).not.toBeChecked();

    await user.click(input);

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      selfIdentifiedUserEnabled: true,
    });
  });

  it('handles enterprise switch changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const input = screen.getByLabelText(textMock('resourceadm.about_resource_enterprise_label'));
    expect(input).not.toBeChecked();

    await user.click(input);

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      enterpriseUserEnabled: true,
    });
  });

  it('handles visible switch changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const input = screen.getByLabelText(textMock('resourceadm.about_resource_visible_label'));
    expect(input).not.toBeChecked();

    await user.click(input);

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      visible: true,
    });
  });

  it('handles consentText changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} resourceData={mockConsentResource} />);

    const consentTextNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_consent_text_label'),
      { exact: false },
    );
    expect(consentTextNbInput).toHaveValue(mockConsentResource.consentText.nb);

    await user.type(consentTextNbInput, mockNewConsentTextInput);
    await waitFor(() => consentTextNbInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      consentText: {
        ...mockConsentResource.consentText,
        nb: `${mockConsentResource.consentText.nb}${mockNewConsentTextInput}`,
      },
    });
  });

  it('handles consentTemplate changes', async () => {
    const user = userEvent.setup();
    const consentTemplateTitle = 'Fullmakt til å utføre en tjeneste';
    render(
      <AboutResourcePage
        {...defaultProps}
        resourceData={{ ...mockConsentResource, consentTemplate: 'sblanesoknad' }}
        consentTemplates={[
          {
            id: 'poa',
            title: consentTemplateTitle,
          } as ConsentTemplate,
          {
            id: 'sblanesoknad',
            title: 'Samtykkebasert lånesøknad',
          } as ConsentTemplate,
        ]}
      />,
    );

    const consentTemplateRadio = screen.getByLabelText(consentTemplateTitle);
    await user.click(consentTemplateRadio);

    expect(consentTemplateRadio).toBeChecked();
  });

  it('displays error if consent templates cannot be loaded', () => {
    render(
      <AboutResourcePage
        {...defaultProps}
        consentTemplates={undefined}
        resourceData={{ ...mockConsentResource }}
      />,
    );

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_templates_error')),
    ).toBeInTheDocument();
  });

  it('handles consentMetadata changes', async () => {
    const user = userEvent.setup();
    render(
      <AboutResourcePage
        {...defaultProps}
        resourceData={{ ...mockConsentResource, consentMetadata: { org: { optional: false } } }}
      />,
    );

    const consentMetadataField = screen.getByLabelText(
      textMock('resourceadm.about_resource_consent_metadata'),
    );
    await user.type(consentMetadataField, ', year');
    await waitFor(() => consentMetadataField.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      consentMetadata: {
        org: { optional: false },
        year: { optional: false },
      },
    });
  });

  it('displays field errors for consent fields', () => {
    const consentTemplateError = 'CONSENT_TEMPLATE_ERROR';
    const consentTextError = 'CONSENT_TEXT_ERROR';

    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[
          {
            field: 'consentTemplate',
            error: consentTemplateError,
          },
          {
            field: 'consentText',
            index: 'nb',
            error: consentTextError,
          },
        ]}
        resourceData={mockConsentResource}
      />,
    );

    expect(screen.getAllByText(consentTemplateError)).toHaveLength(2);
    expect(screen.getAllByText(consentTextError)).toHaveLength(2);
  });

  it('displays errors for the required translation fields', async () => {
    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[
          {
            field: 'resourceType',
            error: textMock('resourceadm.about_resource_resource_type_error'),
          },
          {
            field: 'title',
            index: 'nb',
            error: getMissingInputLanguageString(
              mockResource2.title,
              textMock('resourceadm.about_resource_error_usage_string_title'),
              textMock,
            ),
          },

          {
            field: 'description',
            index: 'nb',
            error: getMissingInputLanguageString(
              mockResource2.description,
              textMock('resourceadm.about_resource_error_usage_string_description'),
              textMock,
            ),
          },
          {
            field: 'rightDescription',
            index: 'nb',
            error: getMissingInputLanguageString(
              mockResource2.rightDescription,
              textMock('resourceadm.about_resource_error_usage_string_rights_description'),
              textMock,
            ),
          },
        ]}
        resourceData={mockResource2}
      />,
    );

    expect(
      screen.getAllByText(textMock('resourceadm.about_resource_resource_type_error')),
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        getMissingInputLanguageString(
          mockResource2.title,
          textMock('resourceadm.about_resource_error_usage_string_title'),
          textMock,
        ),
      ),
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        getMissingInputLanguageString(
          mockResource2.description,
          textMock('resourceadm.about_resource_error_usage_string_description'),
          textMock,
        ),
      ),
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        getMissingInputLanguageString(
          mockResource2.rightDescription,
          textMock('resourceadm.about_resource_error_usage_string_rights_description'),
          textMock,
        ),
      ),
    ).toHaveLength(2);
  });

  it('does not display error message for rights description when delegable is false', async () => {
    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[]}
        resourceData={{ ...mockResource2, delegable: false }}
      />,
    );

    expect(
      screen.queryByText(
        getMissingInputLanguageString(
          mockResource2.rightDescription,
          textMock('resourceadm.about_resource_error_usage_string_rights_description'),
          textMock,
        ),
      ),
    ).not.toBeInTheDocument();
  });

  it('should display access list links when RRR is enabled', async () => {
    render(
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <AboutResourcePage
          {...defaultProps}
          resourceData={{ ...mockResource2, accessListMode: 'Enabled' }}
        />
      </ServicesContextProvider>,
    );

    expect(screen.getByTestId('rrr-buttons')).toBeInTheDocument();
  });

  it('should display correct fields for resourceType MaskinportenSchema', () => {
    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[]}
        resourceData={{ ...mockResource1, resourceType: 'MaskinportenSchema' }}
      />,
    );

    expect(
      screen.queryByLabelText(textMock('resourceadm.about_resource_self_identified_label')),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(textMock('resourceadm.about_resource_enterprise_label')),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(textMock('resourceadm.about_resource_available_for_legend')),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('resourceadm.about_resource_references', { index: 1 })),
    ).toBeInTheDocument();
  });

  it('should display correct fields for resourceType ConsentResource', () => {
    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[]}
        consentTemplates={[]}
        resourceData={{ ...mockResource1, resourceType: 'Consentresource' }}
      />,
    );

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_text_label')),
    ).toBeInTheDocument();

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_template_label')),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(textMock('resourceadm.about_resource_limited_by_rrr_label')),
    ).not.toBeInTheDocument();
  });
});
