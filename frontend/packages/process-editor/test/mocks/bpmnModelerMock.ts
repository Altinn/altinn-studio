export const updatePropertiesMock = jest.fn();
export const updateModdlePropertiesMock = jest.fn();
export const createMock = jest.fn();

export const mockModelerRef = {
  current: {
    get: () => ({
      ...modelingMock,
      create: createMock,
    }),
  },
};

export const modelingMock = {
  updateProperties: updatePropertiesMock,
  updateModdleProperties: updateModdlePropertiesMock,
};
