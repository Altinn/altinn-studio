export const mockModelerRef = {
    current: {
        get: () => ({
            updateProperties: jest.fn(),
        }),
    }
}