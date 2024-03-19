import React from 'react';
import { renderWithProviders } from '../../test/testUtils';
import { ProcessEditor } from './ProcessEditor';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { processEditorWebSocketHub } from 'app-shared/api/paths';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { RoutePaths } from '../../enums/RoutePaths';

jest.mock('app-shared/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn().mockReturnValue({ onWSMessageReceived: jest.fn() }),
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render the ProcessEditor component', () => {
    renderProcessEditor();
  });

  it('should call useWebSocket with the correct parameters', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    renderProcessEditor();

    expect(useWebSocket).toHaveBeenCalledWith({
      webSocketUrl: processEditorWebSocketHub(),
      webSocketConnector: WSConnector,
    });
  });

  it('should call onWSMessageReceived with the correct parameters', () => {
    const onWSMessageReceived = jest.fn();
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived });
    renderProcessEditor();

    expect(onWSMessageReceived).toHaveBeenCalledTimes(1);
  });
});

const renderProcessEditor = (queries: Partial<ServicesContextProps> = {}) => {
  return renderWithProviders(<ProcessEditor />, {
    queryClient: queryClientMock,
    queries: {
      ...queries,
    },
    startUrl: `${APP_DEVELOPMENT_BASENAME}/my-org/my-app/${RoutePaths.ProcessEditor}`,
  });
};
