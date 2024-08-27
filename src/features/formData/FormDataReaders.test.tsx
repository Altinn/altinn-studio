import React from 'react';

import { beforeAll, expect, jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { v4 as uuidv4 } from 'uuid';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { DataModelFetcher } from 'src/features/formData/FormDataReaders';
import { Lang } from 'src/features/language/Lang';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IRawTextResource } from 'src/features/language/textResources';
import type { IData, IDataType } from 'src/types/shared';

interface TestProps {
  ids: string[];
  textResources: IRawTextResource[];
  dataModels: {
    [typeName: string]: object | Promise<object> | Error;
  };
  defaultDataModel: string;
}

function TestComponent({ ids }: TestProps) {
  return (
    <>
      {ids.map((id) => (
        <div
          data-testid={id}
          key={id}
        >
          <Lang
            key={id}
            id={id}
          />
        </div>
      ))}
    </>
  );
}

async function render(props: TestProps) {
  (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementationOnce(() =>
    Promise.resolve(
      getIncomingApplicationMetadataMock((a) => {
        a.dataTypes = a.dataTypes.filter((dt) => !dt.appLogic?.classRef);
        a.dataTypes.push(...generateDataTypes());
      }),
    ),
  );
  const dataModelNames = Object.keys(props.dataModels);
  const idToNameMap: { [id: string]: string } = {};

  const instanceData = getInstanceDataMock((i) => {
    i.data = generateDataElements(i.id);
  });
  const instanceId = instanceData.id;

  function generateDataElements(instanceId: string): IData[] {
    return dataModelNames.map((name) => {
      const id = uuidv4();
      idToNameMap[id] = name;
      return {
        id,
        instanceGuid: instanceId,
        dataType: name,
        contentType: 'application/xml',
        blobStoragePath: `ttd/frontend-test/${instanceId}/data/${id}`,
        size: 1017,
        locked: false,
        refs: [],
        isRead: true,
        created: new Date('2021-06-04T13:26:43.9100666Z').toISOString(),
        createdBy: '12345',
        lastChanged: new Date('2021-06-04T13:26:43.9100666Z').toISOString(),
        lastChangedBy: '12345',
      };
    });
  }

  function generateDataTypes(): IDataType[] {
    return dataModelNames.map((name) => ({
      id: name,
      allowedContentTypes: ['application/xml'],
      appLogic: {
        autoCreate: true,
        classRef: name,
      },
      taskId: 'Task_1',
      maxCount: 1,
      minCount: 1,
    }));
  }

  function urlFor(dataModelName: string) {
    for (const [uuid, name] of Object.entries(idToNameMap)) {
      if (name === dataModelName) {
        const isDefault = dataModelName === props.defaultDataModel;
        return `https://local.altinn.cloud/ttd/test/instances/${instanceId}/data/${uuid}?includeRowId=${isDefault.toString()}&language=nb`;
      }
    }
    return false;
  }

  const utils = await renderWithInstanceAndLayout({
    renderer: () => (
      <>
        <DataModelFetcher />
        <TestComponent {...props} />
      </>
    ),
    queries: {
      fetchInstanceData: async () => instanceData,
      fetchLayoutSets: async () => {
        const mock = getLayoutSetsMock();
        for (const set of mock.sets) {
          set.dataType = props.defaultDataModel;
        }
        return mock;
      },
      fetchTextResources: async () => ({
        resources: props.textResources,
        language: 'nb',
      }),
      fetchFormData: async (url) => {
        const path = new URL(url).pathname;
        const id = path.split('/').pop();
        const modelName = idToNameMap[id!];
        const formData = props.dataModels[modelName];
        if (formData instanceof Error) {
          return Promise.reject(formData);
        }
        if (!formData) {
          throw new Error(`No form data mocked for testing (modelName = ${modelName})`);
        }
        return formData;
      },
    },
  });

  return { ...utils, urlFor };
}

describe('FormDataReaders', () => {
  beforeAll(() => {
    jest
      .spyOn(window, 'logWarnOnce')
      .mockImplementation(() => {})
      .mockName('window.logWarnOnce');
    jest
      .spyOn(window, 'logError')
      .mockImplementation(() => {})
      .mockName('window.logError');
    jest
      .spyOn(window, 'logErrorOnce')
      .mockImplementation(() => {})
      .mockName('window.logErrorOnce');
  });

  it('simple, should render a resource with a variable lookup', async () => {
    const { queries, urlFor } = await render({
      ids: ['test'],
      textResources: [
        {
          id: 'test',
          value: 'Hello {0}',
          variables: [
            {
              dataSource: 'dataModel.someModel',
              key: 'name',
            },
          ],
        },
      ],
      dataModels: {
        someModel: {
          name: 'World',
        },
      },
      defaultDataModel: 'someModel',
    });

    await waitFor(() => expect(screen.getByTestId('test')).toHaveTextContent('Hello World'));

    expect(queries.fetchFormData).toHaveBeenCalledTimes(1);
    expect(queries.fetchFormData).toHaveBeenCalledWith(urlFor('someModel'), {});

    expect(window.logError).not.toHaveBeenCalled();
    expect(window.logErrorOnce).not.toHaveBeenCalled();
  });

  it('advanced, should fetch data from multiple models, handle failures', async () => {
    jest.useFakeTimers();
    const missingError = new Error('This should fail when fetching');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (missingError as any).isAxiosError = true;

    const model2Promise = new Promise((resolve) => {
      setTimeout(() => resolve({ name: 'Universe' }), 100);
    });
    const { queries, urlFor } = await render({
      ids: ['test1', 'test2', 'test3', 'testDefault', 'testMissing', 'testMissingWithDefault'],
      textResources: [
        {
          id: 'test1',
          value: 'Hello {0}',
          variables: [
            {
              dataSource: 'dataModel.model1',
              key: 'name',
            },
          ],
        },
        {
          id: 'test2',
          value: 'Hello {0}',
          variables: [
            {
              dataSource: 'dataModel.model2',
              key: 'name',
            },
          ],
        },
        {
          id: 'test3',
          value: 'You are {0} year(s) old',
          variables: [
            {
              dataSource: 'dataModel.model2',
              key: 'age',
              defaultValue: '[missing]',
            },
          ],
        },
        {
          id: 'testDefault',
          value: 'Hello {0}',
          variables: [
            {
              dataSource: 'dataModel.default',
              key: 'name',
            },
          ],
        },
        {
          id: 'testMissing',
          value: 'Hello {0}',
          variables: [
            {
              dataSource: 'dataModel.modelMissing',
              key: 'name',
            },
          ],
        },
        {
          id: 'testMissingWithDefault',
          value: 'Hello {0}',
          variables: [
            {
              dataSource: 'dataModel.modelMissing',
              key: 'name',
              defaultValue: '[world not found]',
            },
          ],
        },
        {
          id: 'resourceNotInUse',
          value: 'This should never appear {0}',
          variables: [
            {
              dataSource: 'dataModel.thisShouldNotBeFetched',
              key: 'do.not.delete.this.it.is.part.of.the.test',
              defaultValue: 'This tests that we do not fetch data for unused resources',
            },
          ],
        },
      ],
      dataModels: {
        model1: {
          name: 'World',
        },
        model2: model2Promise,
        modelMissing: missingError,
      },
      defaultDataModel: 'model1',
    });

    // The default model should be fetched immediately
    expect(screen.getByTestId('test1')).toHaveTextContent('Hello World');
    expect(screen.getByTestId('testDefault')).toHaveTextContent('Hello World');

    // While other models will be loaded in the background after being accessed
    expect(screen.getByTestId('test2')).toHaveTextContent('Hello ...');
    expect(screen.getByTestId('test3')).toHaveTextContent('You are ... year(s) old');

    jest.runAllTimers();

    await waitFor(() => expect(screen.getByTestId('test1')).toHaveTextContent('Hello World'));
    await waitFor(() => expect(screen.getByTestId('test2')).toHaveTextContent('Hello Universe'));
    await waitFor(() => expect(screen.getByTestId('test3')).toHaveTextContent('You are [missing] year(s) old'));

    expect(screen.getByTestId('testDefault')).toHaveTextContent('Hello World');

    // They should appear again later, when the model is fetched
    await waitFor(() => expect(screen.getByTestId('test2')).toHaveTextContent('Hello Universe'));
    expect(screen.getByTestId('test3')).toHaveTextContent('You are [missing] year(s) old');

    expect(queries.fetchFormData).toHaveBeenCalledTimes(3);
    expect(queries.fetchFormData).toHaveBeenCalledWith(urlFor('model1'), {});
    expect(queries.fetchFormData).toHaveBeenCalledWith(urlFor('model2'), {});
    expect(queries.fetchFormData).toHaveBeenCalledWith(urlFor('modelMissing'), {});

    expect(window.logError).toHaveBeenCalledTimes(1);
    expect(window.logError).toHaveBeenCalledWith('Fetching form data failed:\n', missingError);

    expect(window.logErrorOnce).toHaveBeenCalledWith(
      `One or more text resources look up variables from 'dataModel.modelMissing', but we failed to fetch it:\n`,
      missingError,
    );

    expect(window.logWarnOnce).toHaveBeenCalledWith(
      `A text resource variable with key 'name' did not exist in the data model 'modelMissing'. ` +
        `You may want to set a defaultValue to prevent the full key from being presented to the user.`,
    );
  });
});
