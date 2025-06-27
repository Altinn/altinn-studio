import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { testConsentTemplates } from '../../testing/utils/testUtils';
import { ConsentPreview } from './ConsentPreview';

const consentTemplates = testConsentTemplates;
const defaultProps = {
  template: consentTemplates[0],
  resourceName: {
    nb: 'Inntektsopplysninger',
    nn: 'Inntektsopplysningar',
    en: 'Income statement',
  },
  consentText: {
    nb: 'Inntektsopplysninger for {formaal} år {inntektsaar}, {fraDato} - {tilDato}',
    nn: 'Inntektsopplysningar for {formaal} år {inntektsaar}, {fraDato} - {tilDato}',
    en: 'Income statement for {formaal} year {inntektsaar}, {fraDato} - {tilDato}',
  },
  consentMetadata: {
    formaal: { optional: false },
    inntektsaar: { optional: false },
    fraDato: { optional: false },
    tilDato: { optional: false },
  },
  isOneTimeConsent: false,
};

describe('ConsentPreview', () => {
  afterEach(jest.clearAllMocks);

  it('should show consent template texts for person', () => {
    render(<ConsentPreview {...defaultProps} />);

    expect(screen.getByText(consentTemplates[0].texts.title.person.nb)).toBeInTheDocument();
  });

  it('should show consent template texts for org', async () => {
    const user = userEvent.setup();
    render(<ConsentPreview {...defaultProps} />);

    const orgButton = screen.getByText(textMock('resourceadm.about_resource_consent_preview_org'));
    await user.click(orgButton);

    expect(screen.getByText(consentTemplates[0].texts.title.org.nb)).toBeInTheDocument();
  });

  it('should show consent template texts for language nb', () => {
    render(<ConsentPreview {...defaultProps} />);

    expect(screen.getByText(consentTemplates[0].texts.heading.person.nb)).toBeInTheDocument();
  });

  it('should show consent template texts for language nn', async () => {
    const user = userEvent.setup();
    render(<ConsentPreview {...defaultProps} />);

    const orgButton = screen.getByText(
      textMock('resourceadm.about_resource_consent_preview_language_nn'),
    );
    await user.click(orgButton);

    expect(screen.getByText(consentTemplates[0].texts.heading.person.nn)).toBeInTheDocument();
  });

  it('should show consent template texts for language en', async () => {
    const user = userEvent.setup();
    render(<ConsentPreview {...defaultProps} />);

    const orgButton = screen.getByText(
      textMock('resourceadm.about_resource_consent_preview_language_en'),
    );
    await user.click(orgButton);

    expect(screen.getByText(consentTemplates[0].texts.heading.person.en)).toBeInTheDocument();
  });

  it('should show dummy metadata variables', async () => {
    const user = userEvent.setup();
    render(<ConsentPreview {...defaultProps} />);

    const dummyMetadataSwitch = screen.getByRole('switch', {
      name: textMock('resourceadm.about_resource_consent_preview_dummy_metadata'),
    });
    await user.click(dummyMetadataSwitch);

    const expectedText = 'BANKEN AS ønsker å utføre tjenester på dine vegne';
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it('should show dummy consent message if template does not contain overriddenDelegationContext', () => {
    render(<ConsentPreview {...defaultProps} isOneTimeConsent={true} />);

    expect(screen.getByText(consentTemplates[0].texts.expirationOneTime.nb)).toBeInTheDocument();
  });

  it('should show text for one time consent', () => {
    render(<ConsentPreview {...defaultProps} />);

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_preview_message_placeholder')),
    ).toBeInTheDocument();
  });

  it('should show buttons for consent', () => {
    render(<ConsentPreview {...defaultProps} template={consentTemplates[1]} />);

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_preview_approve_nb')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_preview_reject_nb')),
    ).toBeInTheDocument();
  });

  it('should show buttons for power of attorney', () => {
    render(<ConsentPreview {...defaultProps} />);

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_preview_approve_poa_nb')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_preview_reject_poa_nb')),
    ).toBeInTheDocument();
  });

  it('should show error message if template is not defined', () => {
    render(<ConsentPreview {...defaultProps} template={undefined} />);

    expect(
      screen.getByText(textMock('resourceadm.about_resource_consent_preview_no_template')),
    ).toBeInTheDocument();
  });

  it('should have mobileview class when mobileview is enabled', async () => {
    const user = userEvent.setup();
    render(<ConsentPreview {...defaultProps} />);

    const mobileViewSwitch = screen.getByRole('switch', {
      name: textMock('resourceadm.about_resource_consent_preview_mobile_view'),
    });
    await user.click(mobileViewSwitch);
    expect(screen.getByTestId('consentPreviewContainer')).toHaveClass('mobileView', {
      exact: false,
    });
  });
});
