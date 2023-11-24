import { navigateToAppDevelopment } from './navigationUtils';

const originalWindowLocation = window.location;

describe('navigationUtils', () => {
  const windowLocationAssignMock = jest.fn();
  beforeEach(() => {
    delete window.location;
    window.location = {
      ...originalWindowLocation,
      assign: windowLocationAssignMock,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    window.location = originalWindowLocation;
  });

  it('should navigate to app-development with correct org and repo', () => {
    navigateToAppDevelopment('unit', 'test');
    expect(windowLocationAssignMock).toHaveBeenCalledWith('http://localhost/editor/unit/test/');
  });
});
