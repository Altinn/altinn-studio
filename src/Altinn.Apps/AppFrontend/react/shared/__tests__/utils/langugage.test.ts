import 'jest';
import { ITextResource, IDataSources, IDataSource } from '../../src/types';
import { replaceTextResourceParams } from '../../src/utils/language';


describe('>>> src/Altinn.Apps/AppFrontend/react/shared/src/utils/language.ts', () => {
  let mockTextResources_1 : ITextResource[];
  let mockTextResources_2 : ITextResource[];
  let mockTextResources_3 : ITextResource[];
  let mockDataSources : IDataSources;
  let mockDataSource : IDataSource;

  beforeEach(() => {
    mockTextResources_1 = [
      {id: 'mockId', value: 'This is an {0} text.', unparsedValue: 'This is an {0} text.', variables: [{key: "model.text.adjective", dataSource: "dataModel.test"}]}
    ];

    mockTextResources_2 = [
      {id: 'mockId', value: 'This is a green apple.', unparsedValue: 'This is a {0} apple.', variables: [{key: "model.text.color", dataSource: "dataModel.test"}]}
    ];

    mockTextResources_3 = [
      {id: 'mockId', value: 'This is a text with a missing param: {0}.', unparsedValue: 'This is a text with a missing param: {0}.', variables: [{key: "model.text.param", dataSource: "dataModel.test"}]}
    ];
    mockDataSource = {
      "model.text.adjective":"awesome",
      "model.text.color":"yellow"
    };
    mockDataSources = {
      "dataModel":mockDataSource
    };
  });

  it('+++ should replace parameter for unparsed value', () => {
    replaceTextResourceParams(mockTextResources_1, mockDataSources);
    const textResource = mockTextResources_1.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This is an awesome text.');
  });

  it('+++ should replace parameter for previously value', () => {
    replaceTextResourceParams(mockTextResources_2, mockDataSources);
    const textResource = mockTextResources_2.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This is a yellow apple.');
  });

  it('+++ should replace parameter with text key', () => {
    replaceTextResourceParams(mockTextResources_3, mockDataSources);
    const textResource = mockTextResources_3.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This is a text with a missing param: model.text.param.');
  });
});
