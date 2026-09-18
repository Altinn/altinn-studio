import { screen, waitFor } from '@testing-library/react';
import AiAssistant from './AiAssistant';
import { renderWithProviders } from 'app-development/test/mocks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FeatureName } from 'app-shared/enums/CanUseFeature';
import { createApiErrorMock } from 'app-shared/mocks/apiErrorMock';

jest.mock('./components/AssistantWorkspace', () => ({
  AssistantWorkspace: () => <div>assistant workspace</div>,
}));

const org = 'ttd';
const app = 'test-app';

describe('AiAssistant', () => {
  afterEach(jest.clearAllMocks);

  it('renders a spinner while the access check is in flight', () => {
    renderAiAssistant();

    expect(screen.getByLabelText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('asks the backend whether the assistant is available for this repository', async () => {
    renderAiAssistant();

    await waitFor(() =>
      expect(queriesMock.canUseFeature).toHaveBeenCalledWith(org, app, FeatureName.AiAssistant),
    );
  });

  it('renders the assistant when the developer has access', async () => {
    renderAiAssistant({ hasAccess: true });

    expect(await screen.findByText('assistant workspace')).toBeInTheDocument();
  });

  it('renders the beta message when the developer has no access', async () => {
    renderAiAssistant();

    expect(await screen.findByText(textMock('ai_assistant.access_denied'))).toBeInTheDocument();
  });

  it('denies access when the access check fails', async () => {
    renderAiAssistant({ accessCheckFails: true });

    expect(await screen.findByText(textMock('ai_assistant.access_denied'))).toBeInTheDocument();
  });

  it('does not start an assistant session when the developer has no access', async () => {
    renderAiAssistant();

    await waitFor(() => expect(screen.queryByText('assistant workspace')).not.toBeInTheDocument());
  });
});

type RenderOptions = {
  hasAccess?: boolean;
  accessCheckFails?: boolean;
};

const renderAiAssistant = ({ hasAccess = false, accessCheckFails = false }: RenderOptions = {}) => {
  jest
    .mocked(queriesMock.canUseFeature)
    .mockImplementation(() =>
      accessCheckFails
        ? Promise.reject(createApiErrorMock(500))
        : Promise.resolve({ canUseFeature: hasAccess }),
    );

  return renderWithProviders({}, undefined, {}, `/${org}/${app}`)(<AiAssistant />);
};
