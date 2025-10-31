import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { AboutResourcePageProps } from './AboutResourcePage';
import { AboutResourcePage } from './AboutResourcePage';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type {
  Resource,
  ResourceContactPoint,
  ResourceStatusOption,
  ResourceTypeOption,
  SupportedLanguage,
} from 'app-shared/types/ResourceAdm';
import {
  mapKeywordsArrayToString,
  resourceStatusMap,
} from '../../utils/resourceUtils/resourceUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { testConsentTemplates } from '../../testing/utils/testUtils';
import { useUrlParams } from '../../hooks/useUrlParams';

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
  resourceType: 'Consent',
  consentText: {
    nb: 'Du samtykker til å dele dine data med {org}',
    nn: 'consentNn',
    en: 'consentEn',
  },
  isOneTimeConsent: true,
};

const consentTemplates = testConsentTemplates;

const mockResourceType: ResourceTypeOption = textMock(
  'dashboard.resource_type_generic_access_resource',
) as ResourceTypeOption;
const mockStatus: ResourceStatusOption = 'Deprecated';

const mockNewTitleInput: string = '23';
const mockNewDescriptionInput: string = ' test';
const mockNewHomepageInput: string = 'google.com';
const mockNewKeyboardInput: string = ', key 3';
const mockNewRightDescriptionInput: string = 'mock';
const mockNewConsentTextInput: string = ' og andre';
const mockId: string = 'page-content-deploy';

jest.mock('../../hooks/useUrlParams', () => ({
  useUrlParams: jest.fn(),
}));

describe('AboutResourcePage', () => {
  beforeEach(() => {
    (useUrlParams as jest.Mock).mockReturnValue({
      resourceId: mockResource1.identifier,
      org: 'ttd',
    });
  });
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

  it('should not show resource type Systemresource for org ttd', () => {
    render(<AboutResourcePage {...defaultProps} />);

    expect(
      screen.queryByLabelText(textMock('dashboard.resource_type_system_resource')),
    ).not.toBeInTheDocument();
  });

  it('should show resource type Systemresource for org digdir', async () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      resourceId: mockResource1.identifier,
      org: 'digdir',
    });
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const resourceTypeRadio = screen.getByLabelText(
      textMock('dashboard.resource_type_system_resource'),
    );
    await user.click(resourceTypeRadio);

    expect(resourceTypeRadio).toBeChecked();
  });

  it('handles title input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_title_label'),
    });
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

  it('handles title input change for english', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleEnTab = screen.getByLabelText(
      `${textMock('language.en')} ${textMock('resourceadm.about_resource_resource_title_label')}`,
    );
    await user.click(titleEnTab);

    const titleEnInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_title_label'),
    });
    expect(titleEnInput).toHaveValue(mockResource1.title.en);

    await user.type(titleEnInput, mockNewTitleInput);
    await waitFor(() => titleEnInput.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      title: {
        ...mockResource1.title,
        en: `${mockResource1.title.en}${mockNewTitleInput}`,
      },
    });
  });

  it('calls onSaveResource when going from one input field to another', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const titleNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_title_label'),
    });
    await user.type(titleNbInput, mockNewTitleInput);
    expect(mockOnSaveResource).not.toHaveBeenCalled();

    const descriptionNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_description_label'),
    });
    await user.type(descriptionNbInput, mockNewDescriptionInput);
    expect(mockOnSaveResource).toHaveBeenCalled();
  });

  it('handles description input change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const descriptionNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_description_label'),
    });
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
      textMock('resourceadm.about_resource_delegable_show_text', {
        shouldText: '',
      }),
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

    const rightDescriptionInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_rights_description_label'),
    });
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
      textMock('resourceadm.about_resource_self_identified_show_text', {
        shouldText: textMock('resourceadm.switch_should_not'),
      }),
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

    const input = screen.getByLabelText(
      textMock('resourceadm.about_resource_enterprise_show_text', {
        shouldText: textMock('resourceadm.switch_should_not'),
      }),
    );

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

    const input = screen.getByLabelText(
      textMock('resourceadm.about_resource_visible_show_text', {
        shouldText: textMock('resourceadm.switch_should_not'),
      }),
    );
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

    const consentTextNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_consent_text_label'),
    });
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

  it('handles language change for consentText field', async () => {
    const user = userEvent.setup();
    render(
      <AboutResourcePage
        {...defaultProps}
        resourceData={{ ...mockConsentResource, consentTemplate: 'sblanesoknad' }}
        consentTemplates={consentTemplates}
      />,
    );

    const languageEnTab = screen.getByLabelText(
      `${textMock('language.en')} ${textMock('resourceadm.about_resource_consent_text_label')}`,
    );
    await user.click(languageEnTab);

    const consentEnText = screen.getByText(mockConsentResource.consentText.en, {
      ignore: 'textarea',
    });
    expect(consentEnText).toBeInTheDocument();
  });

  it('should insert markdown list when markdown list button is clicked', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} resourceData={mockConsentResource} />);

    const consentTextNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_consent_text_label'),
    });
    const listMarkdownButton = screen.getByLabelText(
      textMock('resourceadm.about_resource_consent_add_list'),
    );
    await user.click(listMarkdownButton);
    await waitFor(() => consentTextNbInput.blur());

    const listMarkdown = `- Item1\n- Item2\n- Item3\n`;

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      consentText: {
        ...mockConsentResource.consentText,
        nb: `${listMarkdown}${mockConsentResource.consentText.nb}`,
      },
    });
  });

  it('should insert markdown link when markdown link button is clicked', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} resourceData={mockConsentResource} />);

    const consentTextNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_consent_text_label'),
    });
    const linkMarkdownButton = screen.getByLabelText(
      textMock('resourceadm.about_resource_consent_add_link'),
    );
    await user.click(linkMarkdownButton);
    await waitFor(() => consentTextNbInput.blur());

    const linkMarkdown = `[Skriv inn lenketekst](https://altinn.no)`;

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      consentText: {
        ...mockConsentResource.consentText,
        nb: `${linkMarkdown}${mockConsentResource.consentText.nb}`,
      },
    });
  });

  it('should insert metadata when metadata button is clicked', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} resourceData={mockConsentResource} />);

    const consentTextNbInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_consent_text_label'),
    });
    const metadataButton = screen.getByLabelText(
      textMock('resourceadm.about_resource_consent_add_metadata'),
    );
    await user.click(metadataButton);
    await waitFor(() => consentTextNbInput.blur());

    const metadataString = `{metadata}`;

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      consentText: {
        ...mockConsentResource.consentText,
        nb: `${metadataString}${mockConsentResource.consentText.nb}`,
      },
    });
  });

  it('handles consentTemplate changes', async () => {
    const user = userEvent.setup();

    render(
      <AboutResourcePage
        {...defaultProps}
        resourceData={{ ...mockConsentResource, consentTemplate: 'sblanesoknad' }}
        consentTemplates={consentTemplates}
      />,
    );

    const consentTemplateRadio = screen.getByLabelText(consentTemplates[0].title);
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

  it('handles consentMetadata changes and cleans value', async () => {
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
    await user.type(consentMetadataField, ', 1yearå-.., persON');
    await waitFor(() => consentMetadataField.blur());

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      consentMetadata: {
        org: { optional: false },
        year: { optional: false },
        pers: { optional: false },
      },
    });
  });

  it('handles isOneTimeConsent switch changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} resourceData={mockConsentResource} />);

    const isOneTimeConsentInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_one_time_consent_show_text', { shouldText: '' }),
    );
    expect(isOneTimeConsentInput).toBeChecked();

    await user.click(isOneTimeConsentInput);

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockConsentResource,
      isOneTimeConsent: false,
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
            error: 'resource_error_translation_missing_title_nb',
          },
          {
            field: 'description',
            index: 'nb',
            error: 'resource_error_translation_missing_description_nb',
          },
          {
            field: 'rightDescription',
            index: 'nb',
            error: 'resource_error_translation_missing_rights_description_nb',
          },
        ]}
        resourceData={mockResource2}
      />,
    );
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
      screen.queryByText('resource_error_translation_missing_rights_description_nb'),
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

  it('should display correct fields for resourceType consent resource', () => {
    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[]}
        consentTemplates={[]}
        resourceData={{ ...mockResource1, resourceType: 'Consent' }}
      />,
    );

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_text_label')),
    ).toBeInTheDocument();

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_template_label')),
    ).toBeInTheDocument();

    expect(
      screen.getByText(textMock('resourceadm.about_resource_one_time_consent_label')),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(textMock('resourceadm.about_resource_limited_by_rrr_label')),
    ).not.toBeInTheDocument();
  });

  it('should display empty text in description field if language key is not set', async () => {
    const user = userEvent.setup();
    render(
      <AboutResourcePage
        {...defaultProps}
        validationErrors={[]}
        resourceData={{
          ...mockResource1,
          description: {
            nb: mockResource1.description.nb,
          } as SupportedLanguage,
        }}
      />,
    );

    const descriptionEnTab = screen.getByLabelText(
      `${textMock('language.en')} ${textMock('resourceadm.about_resource_resource_description_label')}`,
    );
    await user.click(descriptionEnTab);

    const descriptionEnInput = screen.getByRole('textbox', {
      name: textMock('resourceadm.about_resource_resource_description_label'),
    });
    expect(descriptionEnInput).toHaveValue('');
  });
});
