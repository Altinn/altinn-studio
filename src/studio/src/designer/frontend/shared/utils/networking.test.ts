import axios, {AxiosError} from 'axios';
import { del, get, post, put } from './networking';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const testUrl = 'test';

describe('get', () => {
  describe('when API call is successful', () => {
    it('should return response data', async () => {
      // given
      const config = {};
      const data = [
        { value: '1' },
        { value: '2' },
      ];
      mockedAxios.get.mockResolvedValueOnce({ data });

      // when
      const result = await get(testUrl, config);

      // then
      expect(mockedAxios.get).toHaveBeenCalledWith(testUrl, config);
      expect(result).toEqual(data);
    });
    it('should return null if there is no response data', async () => {
      // given
      const config = {};
      mockedAxios.get.mockResolvedValueOnce({});

      // when
      const result = await get(testUrl, config);

      // then
      expect(mockedAxios.get).toHaveBeenCalledWith(testUrl, config);
      expect(result).toBeNull();
    });
  });
  describe('when API call fails', () => {
    it('should return error code', async () => {
      // given
      const networkError = {
        message: 'Bad request',
        code: '400'
      } as AxiosError;
      mockedAxios.get.mockRejectedValueOnce({...networkError});
      let error;
      try {
        await get(testUrl);
      } catch (err) {
        error = err;
      }

      expect(mockedAxios.get).toHaveBeenCalledWith(testUrl, undefined);
      expect(error.message).toEqual('Bad request');
      expect(error.code).toEqual('400');
    });
  });
});

describe('del', () => {
  describe('when API call is successful', () => {
    it('should return response data', async () => {
      // given
      const config = {};
      const data = [
        { value: '1' },
        { value: '2' },
      ];
      mockedAxios.delete.mockResolvedValueOnce({ data });

      // when
      const result = await del(testUrl, config);

      // then
      expect(mockedAxios.delete).toHaveBeenCalledWith(testUrl, config);
      expect(result).toEqual(data);
    });
  });
  describe('when API call fails', () => {
    it('should return error code', async () => {
      // given
      const networkError = {
        message: 'Bad request',
        code: '400'
      } as AxiosError;
      mockedAxios.delete.mockRejectedValueOnce({...networkError});
      let error;
      try {
        await del(testUrl);
      } catch (err) {
        error = err;
      }

      expect(mockedAxios.delete).toHaveBeenCalledWith(testUrl, undefined);
      expect(error.message).toEqual('Bad request');
      expect(error.code).toEqual('400');
    });
  });
});

describe('post', () => {
  // afterEach(() => {
  //   mockedAxios.post.mockReset();
  // });
  describe('when API call is successful', () => {
    it('should return response data when it exists', async () => {
      // given
      const config = {};
      const data = [
        { value: '1' },
        { value: '2' },
      ];
      mockedAxios.post.mockResolvedValueOnce({ data });

      // when
      const result = await post(testUrl, data, config);

      // then
      expect(mockedAxios.post).toHaveBeenCalledWith(testUrl, data, config);
      expect(result).toEqual(data);
    });

    it('should return null when no response data exists', async () => {
      // given
      const config = {};
      const data = [
        { value: '1' },
        { value: '2' },
      ];
      mockedAxios.post.mockResolvedValueOnce({});

      // when
      const result = await post(testUrl, data, config);

      // then
      expect(mockedAxios.post).toHaveBeenCalledWith(testUrl, data, config);
      expect(result).toBeNull();
    });
  });
  describe('when API call fails', () => {
    it('should return error code', async () => {
      // given
      const networkError = {
        message: 'Bad request',
        code: '400'
      } as AxiosError;
      mockedAxios.post.mockRejectedValueOnce({...networkError});
      let error;
      try {
        await post(testUrl, null);
      } catch (err) {
        error = err;
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(testUrl, null, undefined);
      expect(error.message).toEqual('Bad request');
      expect(error.code).toEqual('400');
    });
  });
});

describe('put', () => {
  // afterEach(() => {
  //   mockedAxios.post.mockReset();
  // });
  describe('when API call is successful', () => {
    it('should return response data when it exists', async () => {
      // given
      const config = {};
      const data = [
        { value: '1' },
        { value: '2' },
      ];
      mockedAxios.put.mockResolvedValueOnce({ data });

      // when
      const result = await put(testUrl, data, config);

      // then
      expect(mockedAxios.put).toHaveBeenCalledWith(testUrl, data, config);
      expect(result).toEqual(data);
    });

    it('should return undefined when no response data exists', async () => {
      // given
      const config = {};
      const data = [
        { value: '1' },
        { value: '2' },
      ];
      mockedAxios.put.mockResolvedValueOnce({});

      // when
      const result = await put(testUrl, data, config);

      // then
      expect(mockedAxios.put).toHaveBeenCalledWith(testUrl, data, config);
      expect(result).toBeUndefined();
    });
  });
  describe('when API call fails', () => {
    it('should return error code', async () => {
      // given
      const networkError = {
        message: 'Bad request',
        code: '400'
      } as AxiosError;
      mockedAxios.put.mockRejectedValueOnce({...networkError});
      let error;
      try {
        await put(testUrl, null);
      } catch (err) {
        error = err;
      }

      expect(mockedAxios.put).toHaveBeenCalledWith(testUrl, null, undefined);
      expect(error.message).toEqual('Bad request');
      expect(error.code).toEqual('400');
    });
  });
});

