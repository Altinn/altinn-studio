export const updatePropertiesMock = jest.fn();
export const updateModdlePropertiesMock = jest.fn();
export const createMock = jest.fn();

export const mockModelerRef = {
  current: {
    get: () => ({
      updateProperties: updatePropertiesMock,
      updateModdleProperties: updateModdlePropertiesMock,
      create: createMock,
    }),
  },
};
