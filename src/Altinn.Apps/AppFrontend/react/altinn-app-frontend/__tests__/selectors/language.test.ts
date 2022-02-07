import { selectAppName, selectAppOwner } from "src/selectors/language";
import { getInitialStateMock } from "../../__mocks__/initialStateMock";

describe('src > selectors > language', () => {
  describe('selectAppName', () => {
    it('should return appName', () => {
      const initialState = getInitialStateMock();
      const result = selectAppName(initialState);
      const expectedResult = 'Test App';
      expect(result).toEqual(expectedResult);
    });
  });

  describe('selectAppOwner', () => {
    it('should return appOwner', () => {
      const initialState = getInitialStateMock();
      const result = selectAppOwner(initialState);
      const expectedResult = 'Mockdepartementet';
      expect(result).toEqual(expectedResult);
    });
  });
})
