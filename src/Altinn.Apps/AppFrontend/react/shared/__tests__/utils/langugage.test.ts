import 'jest';
import { ITextResource, IDataSources, IDataSource } from '../../src/types';
import { replaceTextResourceParams } from '../../src/utils/language';


describe('>>> src/Altinn.Apps/AppFrontend/react/shared/src/utils/language.ts', () => {
  let mockTextResources : ITextResource[];
  let mockDataSources : IDataSources;
  let mockDataSource : IDataSource;

  beforeEach(() => {
    mockDataSource = {
      "model.text.adjective":"awesome",
      "model.text.color":"yellow"
    };
    mockDataSources = {
      "dataModel":mockDataSource
    };
  });

  it('+++ should replace parameter for unparsed value', () => {
    mockTextResources = [
      {id: 'mockId1', value: 'This is an {0} text.', unparsedValue: 'This is an {0} text.', variables: [{key: "model.text.adjective", dataSource: "dataModel.test"}]}
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId1');
    expect(textResource.value).toEqual('This is an awesome text.');
  });

  it('+++ should replace parameter for previously parsed value', () => {
    mockTextResources = [
      {id: 'mockId', value: 'This is a green apple.', unparsedValue: 'This is a {0} apple.', variables: [{key: "model.text.color", dataSource: "dataModel.test"}]}
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This is a yellow apple.');
  });

  it('+++ should replace parameter with text key', () => {
    mockTextResources = [
      {id: 'mockId', value: 'This is a text with a missing param: {0}.', unparsedValue: 'This is a text with a missing param: {0}.', variables: [{key: "model.text.param", dataSource: "dataModel.test"}]}
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This is a text with a missing param: model.text.param.');
  });

  it('+++ should not replace the texts from invalid source', () => {
    mockTextResources = [
      {id: 'mockId', value: 'This: {0} depends on an invalid source.', unparsedValue: 'This: {0} depends on an invalid source.', variables: [{key: "model.text.adjective", dataSource: "api.invalidSource"}]},
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('This: {0} depends on an invalid source.');
  });

  it('+++ should not replace texts when no variable is defined', () => {
    mockTextResources = [
      {id: 'mockId', value: 'mock value', unparsedValue: 'mock value', variables: undefined}
    ];
    replaceTextResourceParams(mockTextResources, mockDataSources);
    const textResource = mockTextResources.find((resource: ITextResource) => resource.id === 'mockId');
    expect(textResource.value).toEqual('mock value');
  });

});
