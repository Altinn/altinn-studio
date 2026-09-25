import { screen } from '@testing-library/react';
import ProcessEditor from './ProcessEditor';
import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { app, org } from '@studio/testing/testids';

const v8EditorText = 'v8 process editor';

jest.mock('@altinn/process-editor-v8', () => ({
  ProcessEditor: () => <div>{v8EditorText}</div>,
}));

describe('ProcessEditor', () => {
  it('renders the legacy process editor', () => {
    renderProcessEditor();

    expect(screen.getByText(v8EditorText)).toBeInTheDocument();
  });
});

const renderProcessEditor = () =>
  renderWithProviders(<ProcessEditor />, {
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
