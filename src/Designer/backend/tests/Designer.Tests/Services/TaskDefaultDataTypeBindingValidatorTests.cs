using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.Validation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services;

public class TaskDefaultDataTypeBindingValidatorTests
{
    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const string SourceRepository = "app-with-layoutsets-v9";
    private const string SecondTaskId = "Task_2";

    private const string SettingsWithoutDefaultDataType = """
        {
          "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
          "pages": { "order": ["Side1"] }
        }
        """;

    private const string ApplicationMetadataWithoutDataTypes = """
        {
          "id": "ttd/app-with-layoutsets-v9",
          "org": "ttd",
          "title": { "nb": "app-with-layoutsets-v9" },
          "dataTypes": [],
          "partyTypesAllowed": {
            "bankruptcyEstate": true,
            "organisation": true,
            "person": true,
            "subUnit": true
          },
          "autoDeleteOnProcessEnd": false
        }
        """;

    [Fact]
    public async Task ValidateAsync_ValidBinding_ReturnsNoErrors()
    {
        IReadOnlyDictionary<string, string[]> errors = await ValidateAsync(SourceRepository);

        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateAsync_SettingsWithoutDefaultDataType_ReturnsMissingError()
    {
        string repository = await CopyRepositoryAsync();
        await WriteRepositoryFileAsync(
            repository,
            SettingsWithoutDefaultDataType,
            "App",
            "ui",
            "Task_1",
            "Settings.json"
        );

        IReadOnlyDictionary<string, string[]> errors = await ValidateAsync(repository);

        KeyValuePair<string, string[]> error = Assert.Single(errors);
        Assert.Equal("taskSettings[Task_1].defaultDataType.missing", error.Key);
    }

    [Fact]
    public async Task ValidateAsync_DefaultDataTypeNotInApplicationMetadata_ReturnsNotFoundError()
    {
        string repository = await CopyRepositoryAsync();
        await WriteRepositoryFileAsync(
            repository,
            ApplicationMetadataWithoutDataTypes,
            "App",
            "config",
            "applicationmetadata.json"
        );

        IReadOnlyDictionary<string, string[]> errors = await ValidateAsync(repository);

        KeyValuePair<string, string[]> error = Assert.Single(errors);
        Assert.Equal("taskSettings[Task_1].defaultDataType.notFound.model", error.Key);
    }

    [Theory]
    [InlineData("data", true)]
    [InlineData("payment", true)]
    [InlineData("signing", true)]
    [InlineData("feedback", false)]
    [InlineData("confirmation", false)]
    public async Task ValidateAsync_TaskWithoutSettings_ReportsOnlyBindableTaskTypes(string taskType, bool expectsError)
    {
        string repository = await CopyRepositoryAsync();
        await WriteRepositoryFileAsync(
            repository,
            ProcessWithSecondTask(taskType),
            "App",
            "config",
            "process",
            "process.bpmn"
        );

        IReadOnlyDictionary<string, string[]> errors = await ValidateAsync(repository);

        Assert.Equal(expectsError, errors.ContainsKey($"taskSettings[{SecondTaskId}].defaultDataType.missing"));
    }

    private static string ProcessWithSecondTask(string taskType) =>
        $$"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="SingleDataTask" isExecutable="false">
                <bpmn:startEvent id="StartEvent_1">
                  <bpmn:outgoing>SequenceFlow_1n56yn5</bpmn:outgoing>
                </bpmn:startEvent>
                <bpmn:task id="Task_1" name="Utfylling">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>data</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                  <bpmn:incoming>SequenceFlow_1n56yn5</bpmn:incoming>
                  <bpmn:outgoing>Flow_to_task</bpmn:outgoing>
                </bpmn:task>
                <bpmn:task id="{{SecondTaskId}}" name="Altinn {{taskType}} task">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{{taskType}}</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                  <bpmn:incoming>Flow_to_task</bpmn:incoming>
                  <bpmn:outgoing>Flow_0gbacsh</bpmn:outgoing>
                </bpmn:task>
                <bpmn:endEvent id="EndEvent_1">
                  <bpmn:incoming>Flow_0gbacsh</bpmn:incoming>
                </bpmn:endEvent>
                <bpmn:sequenceFlow id="SequenceFlow_1n56yn5" sourceRef="StartEvent_1" targetRef="Task_1" />
                <bpmn:sequenceFlow id="Flow_to_task" sourceRef="Task_1" targetRef="{{SecondTaskId}}" />
                <bpmn:sequenceFlow id="Flow_0gbacsh" sourceRef="{{SecondTaskId}}" targetRef="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;

    private static async Task<string> CopyRepositoryAsync()
    {
        string repository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, SourceRepository, Developer, repository);
        return repository;
    }

    private static async Task WriteRepositoryFileAsync(string repository, string content, params string[] segments)
    {
        string[] pathSegments =
        [
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            repository,
            .. segments,
        ];
        string path = Path.Combine(pathSegments);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllTextAsync(path, content);
    }

    private static Task<IReadOnlyDictionary<string, string[]>> ValidateAsync(string repository)
    {
        string repositoriesRoot = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var validator = new TaskDefaultDataTypeBindingValidator(
            new AltinnGitRepositoryFactory(repositoriesRoot),
            new AppVersionService(new AltinnGitRepositoryFactory(repositoriesRoot))
        );
        return validator.ValidateAsync(AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, repository, Developer));
    }
}
