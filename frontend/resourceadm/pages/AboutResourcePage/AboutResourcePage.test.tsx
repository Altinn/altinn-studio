import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AboutResourcePageProps } from './AboutResourcePage';
import { AboutResourcePage } from './AboutResourcePage';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../testing/mocks/i18nMock';
import type {
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
import { addFeatureFlagToLocalStorage } from 'app-shared/utils/featureToggleUtils';
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
const mockResourceType: ResourceTypeOption = textMock(
  'resourceadm.about_resource_resource_type_system_resource',
);
const mockStatus: ResourceStatusOption = 'Deprecated';

const mockNewTitleInput: string = '23';
const mockNewDescriptionInput: string = ' test';
const mockNewHomepageInput: string = 'google.com';
const mockNewKeyboardInput: string = ', key 3';
const mockNewRightDescriptionInput: string = 'mock';
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
    showAllErrors: false,
    resourceData: mockResource1,
    onSaveResource: mockOnSaveResource,
    id: mockId,
  };

  it('handles resource type change', async () => {
    const user = userEvent.setup();
    render(<AboutResourcePage {...defaultProps} />);

    const resourceTypeRadio = screen.getByLabelText(mockResourceType);
    await act(() => user.click(resourceTypeRadio));

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

    await act(() => user.type(titleNbInput, mockNewTitleInput));
    await act(() => titleNbInput.blur());

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
    await act(() => user.type(titleNbInput, mockNewTitleInput));
    expect(mockOnSaveResource).not.toHaveBeenCalled();

    const descriptionNbInput = screen.getByLabelText(
      textMock('resourceadm.about_resource_resource_description_label'),
      { exact: false },
    );
    await act(() => user.type(descriptionNbInput, mockNewDescriptionInput));
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

    await act(() => user.type(descriptionNbInput, mockNewDescriptionInput));
    await act(() => descriptionNbInput.blur());

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

    await act(() => user.clear(homepageInput));
    await act(() => user.type(homepageInput, mockNewHomepageInput));
    await act(() => homepageInput.blur());

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

    await act(() => user.click(delegableInput));

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

    await act(() => user.type(keywordInput, mockNewKeyboardInput));
    await act(() => keywordInput.blur());

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

    await act(() => user.clear(rightDescriptionInput));
    await act(() => user.type(rightDescriptionInput, mockNewRightDescriptionInput));
    await act(() => rightDescriptionInput.blur());

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
    await act(() => user.click(statusRadio));

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

    await act(() => user.click(input));

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

    await act(() => user.click(input));

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

    await act(() => user.click(input));

    expect(mockOnSaveResource).toHaveBeenCalledWith({
      ...mockResource1,
      visible: true,
    });
  });

  it('displays errors for the required translation fields when showAllErrors are true', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(() =>
      render(<AboutResourcePage {...defaultProps} showAllErrors resourceData={mockResource2} />),
    );

    expect(
      screen.getByText(textMock('resourceadm.about_resource_resource_type_error')),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        getMissingInputLanguageString(
          mockResource2.title,
          textMock('resourceadm.about_resource_error_usage_string_title'),
          textMock,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        getMissingInputLanguageString(
          mockResource2.description,
          textMock('resourceadm.about_resource_error_usage_string_description'),
          textMock,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        getMissingInputLanguageString(
          mockResource2.rightDescription,
          textMock('resourceadm.about_resource_error_usage_string_rights_description'),
          textMock,
        ),
      ),
    ).toBeInTheDocument();
  });

  it('does not display error message for rights description when delegable is false', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(() =>
      render(
        <AboutResourcePage
          {...defaultProps}
          showAllErrors
          resourceData={{ ...mockResource2, delegable: false }}
        />,
      ),
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
    addFeatureFlagToLocalStorage('resourceAccessLists');

    render(
      <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
        <AboutResourcePage
          {...defaultProps}
          resourceData={{ ...mockResource2, limitedByRRR: true }}
        />
      </ServicesContextProvider>,
    );

    expect(screen.getByTestId('rrr-buttons')).toBeInTheDocument();
  });

  it('should display correct fields for resourceType MaskinportenSchema', () => {
    render(
      <AboutResourcePage
        {...defaultProps}
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
});
