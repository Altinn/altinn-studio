import { vi } from 'vitest';
export const updatePropertiesMock = vi.fn();
export const updateModdlePropertiesMock = vi.fn();
export const createMock = vi.fn();
export const commandStackExecuteMock = vi.fn();

export const modelerOnMock = vi.fn();
export const modelerOffMock = vi.fn();

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
