import { describe, expect, it } from 'vitest';

import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { brokerProblem, sendErrorMessage, uploadErrorMessage } from 'src/layout/BrokerFileTransfer/messages';

describe('sendErrorMessage', () => {
  it('says the user has no access when Broker refuses them on the resource', () => {
    expect(sendErrorMessage(new ApiError('Unauthorized', 401, { errorCode: 6 }))).toEqual({
      key: 'broker_file_transfer.error_no_access',
    });
  });

  it('asks the user to log in again when Broker does not accept the login', () => {
    expect(sendErrorMessage(new ApiError('Unauthorized', 401, ''))).toEqual({
      key: 'broker_file_transfer.error_login',
    });
  });

  it('says the service is not set up when Broker refuses the resource', () => {
    expect(sendErrorMessage(new ApiError('Request failed: 403', 403, { errorCode: 5 }))).toEqual({
      key: 'broker_file_transfer.error_not_set_up',
    });
  });

  it('says the file can only go to organizations with access when Broker refuses the recipients', () => {
    const notInAccessList = new ApiError('Request failed: 400', 400, { errorCode: 28 });
    const notFound = new ApiError('Request failed: 400', 400, { errorCode: 31 });

    expect(sendErrorMessage(notInAccessList)).toEqual({ key: 'broker_file_transfer.error_recipients_not_allowed' });
    expect(sendErrorMessage(notFound)).toEqual({ key: 'broker_file_transfer.error_recipients_not_allowed' });
  });

  it('suggests trying again after other failures', () => {
    expect(sendErrorMessage(new ApiError('Request failed: 500', 500))).toEqual({
      key: 'broker_file_transfer.error_send_failed',
    });
  });
});

describe('uploadErrorMessage', () => {
  it('asks the user to log in again when Broker stops accepting the login', () => {
    expect(uploadErrorMessage(new ApiError('Unauthorized', 401))).toEqual({ key: 'broker_file_transfer.error_login' });
  });
});

describe('brokerProblem', () => {
  it("reads Broker's error code and reason from its problem details", () => {
    const error = new ApiError('Request failed: 403', 403, {
      errorCode: 5,
      detail: 'Not registered',
      title: 'Forbidden',
    });

    expect(brokerProblem(error)).toEqual({ errorCode: 5, detail: 'Not registered' });
  });

  it('reads nothing from a response without problem details', () => {
    expect(brokerProblem(new ApiError('Unauthorized', 401, ''))).toEqual({});
  });
});
