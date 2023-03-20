using System.Collections;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.Controllers;

public class TestScenariosData : IEnumerable<object[]>
{
    // Add new test data in this list
    private readonly List<ValidateDataTestScenario> _data = new List<ValidateDataTestScenario>
    {
        new ("returns_NotFound_when_GetInstance_returns_null")
        {
            ReceivedInstance = null,
            ExpectedResult = typeof(NotFoundResult)
        },
        new ("thows_ValidationException_when_instance_process_is_null")
        {
            ReceivedInstance = new Instance
            {
                Process = null
            },
            ExpectedExceptionMessage = "Unable to validate instance without a started process."
        },
        new ("thows_ValidationException_when_Instance_Process_CurrentTask_is_null")
        {
            ReceivedInstance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = null
                }
            },
            ExpectedExceptionMessage = "Unable to validate instance without a started process."
        },
        new ("thows_ValidationException_when_Instance_Data_is_empty")
        {
            ReceivedInstance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = "1234"
                    }
                },
                Data = new List<DataElement>()
            },
            ExpectedExceptionMessage = "Unable to validate data element."
        },
        new ("thows_ValidationException_when_Application_DataTypes_is_empty")
        {
            DataGuid = Guid.ParseExact("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd", "D"),
            ReceivedInstance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = "1234"
                    }
                },
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"
                    }
                }
            },
            ReceivedApplication = new ApplicationMetadata("ttd/test")
            {
                DataTypes = new List<DataType>()
            },
            ExpectedExceptionMessage = "Unknown element type."
        },
        new ("adds_ValidationIssue_when_DataType_TaskId_does_not_match_CurrentTask_ElementId")
        {
            InstanceId = Guid.ParseExact("0fc98a23-fe31-4ef5-8fb9-dd3f479354ef", "D"),
            DataGuid = Guid.ParseExact("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd", "D"),
            ReceivedInstance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = "1234"
                    }
                },
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd",
                        DataType = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"
                    }
                }
            },
            ReceivedApplication = new ApplicationMetadata("ttd/test")
            {
                DataTypes = new List<DataType>
                {
                    new DataType
                    {
                        Id = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd",
                        TaskId = "1234"
                    }
                }
            },
            ReceivedValidationIssues = new List<ValidationIssue>(),
            ExpectedValidationIssues = new List<ValidationIssue>
            {
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask,
                    InstanceId = "0fc98a23-fe31-4ef5-8fb9-dd3f479354ef",
                    Severity = ValidationIssueSeverity.Warning,
                    DataElementId = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd",
                    Description = AppTextHelper.GetAppText(
                        ValidationIssueCodes.DataElementCodes.DataElementValidatedAtWrongTask,
                        new Dictionary<string, Dictionary<string, string>>(), null, "nb")
                }
            },
            ExpectedResult = typeof(OkObjectResult)
        },
        new ("returns_ValidationIssues_from_ValidationService")
        {
            InstanceId = Guid.ParseExact("0fc98a23-fe31-4ef5-8fb9-dd3f479354ef", "D"),
            DataGuid = Guid.ParseExact("0fc98a23-fe31-4ef5-8fb9-dd3f479354cd", "D"),
            ReceivedInstance = new Instance
            {
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"
                    }
                },
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd",
                        DataType = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd"
                    }
                }
            },
            ReceivedApplication = new ApplicationMetadata("ttd/test")
            {
                DataTypes = new List<DataType>
                {
                    new DataType
                    {
                        Id = "0fc98a23-fe31-4ef5-8fb9-dd3f479354cd",
                        TaskId = "1234"
                    }
                }
            },
            ReceivedValidationIssues = new List<ValidationIssue>
            {
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Fixed
                }
            },
            ExpectedValidationIssues = new List<ValidationIssue>
            {
                new ValidationIssue
                {
                    Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
                    Severity = ValidationIssueSeverity.Fixed
                }
            },
            ExpectedResult = typeof(OkObjectResult)
        }
    };

    public IEnumerator<object[]> GetEnumerator()
    {
        List<object[]> testData = new List<object[]>();
        foreach (var d in _data)
        {
            testData.Add(new object[] { d });
        }

        return testData.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator()
    {
        return GetEnumerator();
    }
}

public class ValidationControllerValidateDataTests
{
    [Theory]
    [ClassData(typeof(TestScenariosData))]
    public async Task TestValidateData(ValidateDataTestScenario testScenario)
    {
        // Arrange
        const string org = "ttd";
        const string app = "app-test";
        const int instanceOwnerId = 1337;

        var validateController = SetupController(app, org, instanceOwnerId, testScenario);

        // Act and Assert
        if (testScenario.ExpectedExceptionMessage == null)
        {
            var result = await validateController.ValidateData(org, app, instanceOwnerId, testScenario.InstanceId,
                testScenario.DataGuid);
            Assert.IsType(testScenario.ExpectedResult, result);
        }
        else
        {
            var exception = await Assert.ThrowsAsync<ValidationException>(() =>
                validateController.ValidateData(org, app, instanceOwnerId, testScenario.InstanceId,
                    testScenario.DataGuid));
            Assert.Equal(testScenario.ExpectedExceptionMessage, exception.Message);
        }
    }

    private static ValidateController SetupController(string app, string org, int instanceOwnerId,
        ValidateDataTestScenario testScenario)
    {
        (Mock<IInstance> instanceMock, Mock<IAppMetadata> appResourceMock, Mock<IValidation> validationMock) =
            SetupMocks(app, org, instanceOwnerId, testScenario);

        return new ValidateController(instanceMock.Object, validationMock.Object, appResourceMock.Object);
    }

    private static (Mock<IInstance>, Mock<IAppMetadata>, Mock<IValidation>) SetupMocks(string app, string org,
        int instanceOwnerId, ValidateDataTestScenario testScenario)
    {
        var instanceMock = new Mock<IInstance>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var validationMock = new Mock<IValidation>();
        if (testScenario.ReceivedInstance != null)
        {
            instanceMock.Setup(i => i.GetInstance(app, org, instanceOwnerId, testScenario.InstanceId))
                .Returns(Task.FromResult<Instance>(testScenario.ReceivedInstance));
        }
        if (testScenario.ReceivedApplication != null)
        {
            appMetadataMock.Setup(a => a.GetApplicationMetadata())
                .ReturnsAsync(testScenario.ReceivedApplication);
        }

        if (testScenario.ReceivedInstance != null && testScenario.ReceivedApplication != null && testScenario.ReceivedValidationIssues != null)
        {
            validationMock.Setup(v => v.ValidateDataElement(
                    testScenario.ReceivedInstance,
                    testScenario.ReceivedApplication.DataTypes.First(),
                    testScenario.ReceivedInstance.Data.First()))
                .Returns(Task.FromResult<List<ValidationIssue>>(testScenario.ReceivedValidationIssues));
        }

        return (instanceMock, appMetadataMock, validationMock);
    }
}

public class ValidateDataTestScenario
{
    public ValidateDataTestScenario(string testScenarioName)
    {
        TestScenarioName = testScenarioName;
    }
    public string TestScenarioName { get; init; }
    public Guid InstanceId { get; init; } = Guid.NewGuid();
    public Guid DataGuid { get; init; } = Guid.NewGuid();
    public Instance? ReceivedInstance { get; init; }
    public ApplicationMetadata? ReceivedApplication { get; init; }
    public List<ValidationIssue>? ReceivedValidationIssues { get; init; }
    public string? ExpectedExceptionMessage { get; init; }
    public Type? ExpectedResult { get; init; }
    public List<ValidationIssue>? ExpectedValidationIssues { get; init; }

    public override string ToString()
    {
        return TestScenarioName;
    }
}