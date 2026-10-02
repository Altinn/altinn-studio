import type { AxiosError } from 'axios';
import axios from 'axios';
import { del, get, getWithRevision, patch, post, put, putWithRevision } from './networking';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const testUrl = 'test';

describe('get', () => {
  describe('when API call is successful', () => {
    it('should return response data', async () => {
      // given
      const config = {};
      const data = [{ value: '1' }, { value: '2' }];
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
        code: '400',
      } as AxiosError;
      mockedAxios.get.mockRejectedValueOnce({ ...networkError });
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
      const data = [{ value: '1' }, { value: '2' }];
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
        code: '400',
      } as AxiosError;
      mockedAxios.delete.mockRejectedValueOnce({ ...networkError });
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
      const data = [{ value: '1' }, { value: '2' }];
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
      const data = [{ value: '1' }, { value: '2' }];
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
        code: '400',
      } as AxiosError;
      mockedAxios.post.mockRejectedValueOnce({ ...networkError });
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
      const data = [{ value: '1' }, { value: '2' }];
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
      const data = [{ value: '1' }, { value: '2' }];
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
        code: '400',
      } as AxiosError;
      mockedAxios.put.mockRejectedValueOnce({ ...networkError });
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

describe('patch', () => {
  describe('when API call is successful', () => {
    it('should return response data when it exists', async () => {
      // given
      const config = {};
      const data = [{ value: '1' }, { value: '2' }];
      mockedAxios.patch.mockResolvedValueOnce({ data });

      // when
      const result = await patch(testUrl, data, config);

      // then
      expect(mockedAxios.patch).toHaveBeenCalledWith(testUrl, data, config);
      expect(result).toEqual(data);
    });

    it('should return undefined when no response data exists', async () => {
      // given
      const config = {};
      const data = [{ value: '1' }, { value: '2' }];
      mockedAxios.patch.mockResolvedValueOnce({});

      // when
      const result = await patch(testUrl, data, config);

      // then
      expect(mockedAxios.patch).toHaveBeenCalledWith(testUrl, data, config);
      expect(result).toBeUndefined();
    });
  });
  describe('when API call fails', () => {
    it('should return error code', async () => {
      // given
      const networkError = {
        message: 'Bad request',
        code: '400',
      } as AxiosError;
      mockedAxios.patch.mockRejectedValueOnce({ ...networkError });
      let error;
      try {
        await patch(testUrl, null);
      } catch (err) {
        error = err;
      }

      expect(mockedAxios.patch).toHaveBeenCalledWith(testUrl, null, undefined);
      expect(error.message).toEqual('Bad request');
      expect(error.code).toEqual('400');
    });
  });
});

type Document = { title: string; revision?: string };

describe('getWithRevision', () => {
  it('returns the document with the ETag response header as its revision', async () => {
    const data = { title: 'Document' };
    mockedAxios.get.mockResolvedValueOnce({ data, headers: { etag: '"abc123"' } });

    const result = await getWithRevision(testUrl);

    expect(mockedAxios.get).toHaveBeenCalledWith(testUrl, undefined);
    expect(result).toEqual({ title: 'Document', revision: '"abc123"' });
  });

  it('returns the document as it is when the response has no ETag header', async () => {
    const data = { title: 'Document' };
    mockedAxios.get.mockResolvedValueOnce({ data, headers: {} });

    const result = await getWithRevision(testUrl);

    expect(result).toEqual(data);
    expect(result).not.toHaveProperty('revision');
  });
});

describe('putWithRevision', () => {
  it('sends the revision in an If-Match header instead of in the body', async () => {
    const config = { headers: { 'Content-Type': 'application/json' } };
    mockedAxios.put.mockResolvedValueOnce({ data: { title: 'Saved' }, headers: {} });

    await putWithRevision(testUrl, { title: 'Draft', revision: '"abc123"' }, config);

    expect(mockedAxios.put).toHaveBeenCalledWith(
      testUrl,
      { title: 'Draft' },
      { headers: { 'Content-Type': 'application/json', 'If-Match': '"abc123"' } },
    );
  });

  it('returns the saved document with the ETag response header as its revision', async () => {
    mockedAxios.put.mockResolvedValueOnce({
      data: { title: 'Saved' },
      headers: { etag: '"def456"' },
    });

    const result = await putWithRevision(testUrl, { title: 'Draft', revision: '"abc123"' });

    expect(result).toEqual({ title: 'Saved', revision: '"def456"' });
  });

  it('sends a document without a revision as put does', async () => {
    const data: Document = { title: 'Draft' };
    mockedAxios.put.mockResolvedValueOnce({ data, headers: {} });

    const result = await putWithRevision(testUrl, data);

    expect(mockedAxios.put).toHaveBeenCalledWith(testUrl, data, undefined);
    expect(result).toEqual(data);
  });

  it('rejects with the error of a failed request', async () => {
    const error = { response: { status: 412 } };
    mockedAxios.put.mockRejectedValueOnce(error);

    await expect(putWithRevision(testUrl, { revision: '"abc123"' })).rejects.toBe(error);
  });
});
