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

    [Fact]
    public async Task ValidateAsync_V9AppWithValidBinding_ReturnsNoErrors()
    {
        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            "app-with-layoutsets-v9",
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateAsync_MissingDefaultDataType_ReturnsError()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string settingsPath = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "ui",
            "Task_1",
            "Settings.json"
        );
        await File.WriteAllTextAsync(
            settingsPath,
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
              "pages": { "order": ["Side1"] }
            }
            """
        );

        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        KeyValuePair<string, string[]> error = Assert.Single(errors);
        Assert.Equal("taskSettings[Task_1].defaultDataType.missing", error.Key);
    }

    [Fact]
    public async Task ValidateAsync_DanglingDefaultDataType_ReturnsError()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string metadataPath = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "config",
            "applicationmetadata.json"
        );
        await File.WriteAllTextAsync(
            metadataPath,
            """
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
            """
        );

        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        KeyValuePair<string, string[]> error = Assert.Single(errors);
        Assert.Equal("taskSettings[Task_1].defaultDataType.notFound.model", error.Key);
    }

    [Fact]
    public async Task ValidateAsync_FeedbackTaskWithoutSettings_ReturnsNoErrors()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string processPath = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "config",
            "process",
            "process.bpmn"
        );
        await File.WriteAllTextAsync(
            processPath,
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
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
                  <bpmn:outgoing>Flow_to_feedback</bpmn:outgoing>
                </bpmn:task>
                <bpmn:task id="Activity_feedback" name="Altinn feedback task">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>feedback</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                  <bpmn:incoming>Flow_to_feedback</bpmn:incoming>
                  <bpmn:outgoing>Flow_0gbacsh</bpmn:outgoing>
                </bpmn:task>
                <bpmn:endEvent id="EndEvent_1">
                  <bpmn:incoming>Flow_0gbacsh</bpmn:incoming>
                </bpmn:endEvent>
                <bpmn:sequenceFlow id="SequenceFlow_1n56yn5" sourceRef="StartEvent_1" targetRef="Task_1" />
                <bpmn:sequenceFlow id="Flow_to_feedback" sourceRef="Task_1" targetRef="Activity_feedback" />
                <bpmn:sequenceFlow id="Flow_0gbacsh" sourceRef="Activity_feedback" targetRef="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );

        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("payment", "Activity_payment")]
    [InlineData("signing", "Activity_signing")]
    public async Task ValidateAsync_LayoutSetTaskWithoutDefaultDataType_ReturnsError(string taskType, string taskId)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string processPath = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "config",
            "process",
            "process.bpmn"
        );
        await File.WriteAllTextAsync(
            processPath,
            $$"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
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
                <bpmn:task id="{{taskId}}" name="Altinn {{taskType}} task">
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
                <bpmn:sequenceFlow id="Flow_to_task" sourceRef="Task_1" targetRef="{{taskId}}" />
                <bpmn:sequenceFlow id="Flow_0gbacsh" sourceRef="{{taskId}}" targetRef="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );
        string settingsDir = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "ui",
            taskId
        );
        Directory.CreateDirectory(settingsDir);
        await File.WriteAllTextAsync(
            Path.Combine(settingsDir, "Settings.json"),
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
              "pages": { "order": ["Side1"] }
            }
            """
        );

        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        Assert.Contains($"taskSettings[{taskId}].defaultDataType.missing", errors.Keys);
    }

    private static TaskDefaultDataTypeBindingValidator CreateValidator()
    {
        string repositoriesRoot = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        return new TaskDefaultDataTypeBindingValidator(
            new AltinnGitRepositoryFactory(repositoriesRoot),
            new AppVersionService(new AltinnGitRepositoryFactory(repositoriesRoot))
        );
    }
}
