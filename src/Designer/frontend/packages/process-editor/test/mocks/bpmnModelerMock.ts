export const updatePropertiesMock = jest.fn();
export const updateModdlePropertiesMock = jest.fn();
export const createMock = jest.fn();
export const commandStackExecuteMock = jest.fn();

export const mockModelerRef = {
  current: {
    get: (service: string) => {
      if (service === 'commandStack') {
        return {
          execute: commandStackExecuteMock,
        };
      }
      return {
        ...modelingMock,
        create: createMock,
      };
    },
  },
};

export const modelingMock = {
  updateProperties: updatePropertiesMock,
  updateModdleProperties: updateModdlePropertiesMock,
};
