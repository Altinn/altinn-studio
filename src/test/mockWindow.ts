export function mockWindow(search?: string) {
  const realLocation = window.location;
  const mockAssign = jest.fn();

  beforeEach(() => {
    // @ts-expect-error Need to delete window.location to be able to mock assign
    delete window.location;
    window.location = { ...realLocation, assign: mockAssign, ...(search && { search }) };
  });

  afterEach(() => {
    window.location = realLocation;
    jest.clearAllMocks();
  });

  return { mockAssign };
}

type MockWindowWithSearch = {
  search?: string;
  origin?: string;
};
export function mockWindowWithSearch({ search, origin }: MockWindowWithSearch) {
  const realLocation = window.location;
  const mockAssign = jest.fn();

  // @ts-expect-error Need to delete window.location to be able to mock assign
  delete window.location;
  window.location = { ...realLocation, assign: mockAssign, ...(search && { search }), ...(origin && { origin }) };

  function clearWindow() {
    window.location = realLocation;
    jest.clearAllMocks();
  }
  return { mockAssign, clearWindow };
}
