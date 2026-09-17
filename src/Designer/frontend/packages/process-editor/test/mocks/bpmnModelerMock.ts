export const updatePropertiesMock = jest.fn();
export const updateModdlePropertiesMock = jest.fn();
export const createMock = jest.fn();
export const commandStackExecuteMock = jest.fn();

export const modelerOnMock = jest.fn();
export const modelerOffMock = jest.fn();

export const mockModelerRef = {
  current: {
    on: modelerOnMock,
    off: modelerOffMock,
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
