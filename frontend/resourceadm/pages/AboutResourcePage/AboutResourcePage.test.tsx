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
} from 'app-shared/types/ResourceAdm';
import {
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
  resourceType: 'Consent',
  consentText: {
    nb: 'Du samtykker til å dele dine data med {org}',
    nn: 'consentNn',
    en: 'consentEn',
  },
  isOneTimeConsent: true,
};
const consentTemplateTitle = 'Fullmakt til å utføre en tjeneste';
const consentTemplates = [
  {
    id: 'poa',
    version: 1,
    title: consentTemplateTitle,
    isPoa: true,
    isMessageSetInRequest: true,
    restrictedToServiceOwners: null,
    texts: {
      title: {
        person: {
          nb: 'Fullmakt til å handle på dine vegne',
          nn: 'Fullmakt til å handla på dine vegne',
          en: 'Power of attorney to act on your behalf',
        },
        org: {
          nb: 'Fullmakt til å handle på vegne av {OfferedBy}',
          nn: 'Fullmakt til å handla på vegne av {OfferedBy}',
          en: 'Power of attorney to act on behalf of {OfferedBy}',
        },
      },
      heading: {
        person: {
          nb: '{CoveredBy} ønsker å utføre tjenester på dine vegne',
          nn: '{CoveredBy} ønsker å utføra tenester på dine vegne',
          en: '{CoveredBy} requests power of attorney from you',
        },
        org: {
          nb: '{CoveredBy} ønsker å utføre tjenester på vegne av {OfferedBy}',
          nn: '{CoveredBy} ønsker å utføra tenester på vegne av {OfferedBy}',
          en: '{CoveredBy} requests power of attorney from {OfferedBy}',
        },
      },
      serviceIntro: {
        person: {
          nb: 'Ved at du gir fullmakt, får {CoveredBy} tilgang til følgende tjenester på dine vegne',
          nn: 'Ved at du gjer fullmakt, får {CoveredBy} tilgang til følgjande tenester på dine vegne',
          en: 'By granting power of attorney, {CoveredBy} gets access to the following services on your behalf',
        },
        org: {
          nb: 'Ved at du gir fullmakt, får {CoveredBy} tilgang til følgende tjenester på vegne av {OfferedBy}',
          nn: 'Ved at du gjer fullmakt, får {CoveredBy} tilgang til følgjande tenester på vegne av {OfferedBy}',
          en: 'By granting power of attorney, {CoveredBy} get access to the following services on behalf of {OfferedBy}',
        },
      },
      overriddenDelegationContext: null,
      expiration: {
        nb: 'Fullmakten er tidsavgrenset og vil gå ut {Expiration}',
        nn: 'Fullmakta er tidsavgrensa og vil gå ut {Expiration}',
        en: 'The power of attorney is time-limited, and will expire {Expiration}',
      },
      expirationOneTime: {
        nb: 'Fullmakten gjelder én gangs bruk av tjenestene',
        nn: 'Fullmakta gjeld bruk av tenestene éin gong',
        en: 'The power of attorney applies for one-time access to the service.',
      },
      serviceIntroAccepted: {
        person: {
          nb: 'Fullmakten gir {CoveredBy} tilgang til følgende tjenester på dine vegne',
          nn: 'Fullmakta gjer {CoveredBy} tilgang til følgjande tenester på dine vegne',
          en: 'The power of attorney gives {CoveredBy} access to the following services on your behalf',
        },
        org: {
          nb: 'Fullmakten gir {CoveredBy} tilgang til følgende tjenester på vegne av {OfferedBy}',
          nn: 'Fullmakta gjer {CoveredBy} tilgang til følgjande tenester på vegne av {OfferedBy}',
          en: 'The power of attorney gives {CoveredBy} access to the following services on behalf of {OfferedBy}',
        },
      },
      handledBy: {
        nb: '{HandledBy} utfører tjenestene på vegne av {CoveredBy}.',
        nn: '{HandledBy} utfører tenestene på vegne av {CoveredBy}',
        en: '{HandledBy} utilizes the power of attorney on behalf of {CoveredBy}.',
      },
      historyUsedBody: {
        nb: '{CoveredBy} har handlet på vegne av {OfferedBy}. Fullmakten utløper {Expiration}',
        nn: '{CoveredBy} har handlet på vegne av {OfferedBy}. Fullmakten utløper {Expiration}',
        en: '{CoveredBy} has acted on behalf of {OfferedBy}. The authority expires {Expiration}',
      },
      historyUsedByHandledByBody: {
        nb: '{HandledBy} har, på vegne av {CoveredBy}, handlet på vegne av {OfferedBy}. Fullmakten utløper {Expiration}',
        nn: '{HandledBy} har, på vegne av {CoveredBy}, handla på vegne av {OfferedBy}. Samtykket utløper {Expiration}',
        en: '{HandledBy} has, on behalf of {CoveredBy}, acted on behalf of {OfferedBy}. The authority expires {Expiration}',
      },
    },
  },
  {
    id: 'sblanesoknad',
    version: 1,
    title: 'Samtykkebasert lånesøknad',
    isPoa: false,
    isMessageSetInRequest: false,
    restrictedToServiceOwners: ['skd', 'ttd'],
    texts: {
      title: {
        person: {
          nb: 'Samtykke til bruk av dine data',
          nn: 'Samtykke til bruk av dine data',
          en: 'Consent to use of your data',
        },
        org: {
          nb: 'Samtykke til bruk av {OfferedBy} sine data',
          nn: 'Samtykke til bruk av {OfferedBy} sine data',
          en: 'Consent to use of the data of {OfferedBy}',
        },
      },
      heading: {
        person: {
          nb: '{CoveredBy} ønsker å hente opplysninger om deg',
          nn: '{CoveredBy} ønskjer å hente opplysningar om deg',
          en: '{CoveredBy} requests information about you',
        },
        org: {
          nb: '{CoveredBy} ønsker å hente opplysninger om {OfferedBy}',
          nn: '{CoveredBy} ønskjer å hente opplysningar om  {OfferedBy}',
          en: '{CoveredBy} requests information about {OfferedBy}',
        },
      },
      serviceIntro: {
        person: {
          nb: 'Ved at du samtykker, får {CoveredBy} tilgang til følgende opplysninger om deg',
          nn: 'Ved at du samtykker, får {CoveredBy} tilgang til følgjande opplysningar om deg',
          en: 'By giving consent, {CoveredBy} gets access to the following information about you',
        },
        org: {
          nb: 'Ved at du samtykker, får {CoveredBy} tilgang til følgende opplysninger om {OfferedBy}',
          nn: 'Ved at du samtykker, får {CoveredBy} tilgang til følgjande opplysningar om {OfferedBy}',
          en: 'By giving consent, {CoveredBy} gets access to the following information about {OfferedBy}',
        },
      },
      overriddenDelegationContext: {
        nb: 'Ved å samtykke, gir du Skatteetaten rett til å utlevere opplysninger om deg direkte til {CoveredBy}. Banken får opplysningene for å behandle søknaden din om finansiering',
        nn: 'Ved å samtykka, gir du Skatteetaten rett til å utlevera opplysningar om deg direkte til {CoveredBy}. Banken får opplysningane for å behandla søknaden din om finansiering.',
        en: 'By consenting you grant the The Norwegian Tax Administration the right to disclose information about you directly to {CoveredBy}. The bank receives the information to process your application for financing',
      },
      expiration: {
        nb: 'Samtykket er tidsavgrenset og vil gå ut {Expiration}',
        nn: 'Samtykket er tidsavgrensa og vil gå ut {Expiration}',
        en: 'The consent is time-limited, and will expire {Expiration}',
      },
      expirationOneTime: {
        nb: 'Samtykket gjelder én gangs utlevering av opplysningene.',
        nn: 'Samtykket gjeld ein gongs utlevering av opplysningane.',
        en: 'The consent applies for one-time disclosure of information.',
      },
      serviceIntroAccepted: {
        person: {
          nb: 'Samtykket gir {CoveredBy} tilgang til følgende opplysninger om deg',
          nn: 'Samtykket gir {CoveredBy} tilgang til følgjande opplysningar om deg',
          en: 'The consent gives {CoveredBy} access to the following information about you',
        },
        org: {
          nb: 'Samtykket gir {CoveredBy} tilgang til følgende opplysninger om {OfferedBy}',
          nn: 'Samtykket gir {CoveredBy} tilgang til følgjande opplysningar om {OfferedBy}',
          en: 'The consent gives {CoveredBy} access to the following information about {OfferedBy}',
        },
      },
      handledBy: {
        nb: '{HandledBy} foretar dette oppslaget på vegne av {CoveredBy}.',
        nn: '{HandledBy} gjer dette oppslaget på vegne av {CoveredBy}.',
        en: '{HandledBy} performs the lookup on behalf of {CoveredBy}.',
      },
      historyUsedBody: {
        nb: '{CoveredBy} har hentet data for {OfferedBy}. Samtykket utløper {Expiration}',
        nn: '{CoveredBy} har henta data for {OfferedBy}. Samtykket utløper {Expiration}',
        en: '{CoveredBy} has retrieved data for {OfferedBy}. The consent expires {Expiration}',
      },
      historyUsedByHandledByBody: {
        nb: '{HandledBy} har, på vegne av {CoveredBy}, hentet data om {OfferedBy}. Samtykket utløper {Expiration}',
        nn: '{HandledBy} har, på vegne av {CoveredBy}, henta data om {OfferedBy}. Samtykket utløper {Expiration}',
        en: '{HandledBy} has, on behalf of {CoveredBy}, retrieved data about {OfferedBy}. The consent expires {Expiration}',
      },
    },
  },
];

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

  it('handles consentTemplate changes', async () => {
    const user = userEvent.setup();

    render(
      <AboutResourcePage
        {...defaultProps}
        resourceData={{ ...mockConsentResource, consentTemplate: 'sblanesoknad' }}
        consentTemplates={consentTemplates}
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

  it('handles isOneTimeConsent switch changes', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} resourceData={mockConsentResource} />);

    const isOneTimeConsentInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_one_time_consent_label'),
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
});
