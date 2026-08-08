using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Newtonsoft.Json;
using Xunit.Abstractions;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.App.Api.Tests.Controllers;

[Collection("Process version admission file-backed tests")]
public class ProcessControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    // Define constants
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private static readonly Guid _instanceGuid = new("5a2fa5ec-f97c-4816-b57a-dc78a981917e");
    private static readonly string _instanceId = $"{InstanceOwnerPartyId}/{_instanceGuid}";
    private static readonly Guid _dataGuid = new("cd691c32-ae36-4555-8aee-0b7054a413e4");
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    // Define mocks
    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict);

    // Constructor with common setup
    public ProcessControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        _formDataValidatorMock.SetupGet(v => v.NoIncrementalValidation).Returns(false);
        _formDataValidatorMock.SetupGet(v => v.ShouldRunAfterRemovingHiddenData).Returns(false);
        _formDataValidatorMock.Setup(v => v.DataType).Returns("9edd53de-f46f-40a1-bb4d-3efb93dc113d");
        _formDataValidatorMock.Setup(v => v.ValidationSource).Returns("Not a valid validation source");
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessorMock.Object);
            services.AddSingleton(_formDataValidatorMock.Object);
        };
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task Get_ShouldReturnProcessTasks()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int partyId = 500000;
        Guid instanceId = new Guid("5d9e906b-83ed-44df-85a7-2f104c640bff");

        HttpClient client = GetRootedUserClient(org, app, 1337, partyId, 3);

        TestData.PrepareInstance(org, app, partyId, instanceId);

        string url = $"/{org}/{app}/instances/{partyId}/{instanceId}/process";
        HttpResponseMessage response = await client.GetAsync(url);
        TestData.DeleteInstanceAndData(org, app, partyId, instanceId);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var expectedString = """
            {
              "currentTask": {
                "actions": {
                  "read": true,
                  "write": true
                },
                "userActions": [
                  {
                    "id": "read",
                    "authorized": true,
                    "type": "ProcessAction"
                  },
                  {
                    "id": "write",
                    "authorized": true,
                    "type": "ProcessAction"
                  }
                ],
                "read": true,
                "write": true,
                "flow": 2,
                "started": "2019-12-05T13:24:34.9196661Z",
                "elementId": "Task_1",
                "name": "Utfylling",
                "altinnTaskType": "data",
                "ended": null,
                "validated": {
                  "timestamp": "2020-02-07T10:46:36.985894Z",
                  "canCompleteTask": false
                },
                "flowType": null
              },
              "processTasks": [
                {
                  "altinnTaskType": "data",
                  "elementId": "Task_1"
                }
              ],
              "status": "processing",
              "started": "2019-12-05T13:24:34.8412179Z",
              "startEvent": "StartEvent_1",
              "ended": null,
              "endEvent": null
            }
            """;
        CompareResult<AppProcessState>(expectedString, content);
    }

    [Fact]
    public async Task RunProcessNextWithLang_VerifyPdfCallWithLanguage()
    {
        var language = "es";
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");

            var content = await message.Content!.ReadAsStringAsync();

            OutputHelper.WriteLine("pdf request content:");
            OutputHelper.WriteLine(content);
            OutputHelper.WriteLine("");

            using var document = JsonDocument.Parse(content);
            document.RootElement.GetProperty("url").GetString().Should().Contain($"lang={language}");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        // both "?lang" and "?language" should work
        var nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?lang={language}",
            null
        );
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RunProcessNextWithLanguage_VerifyPdfCall()
    {
        var language = "es";
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");

            var content = await message.Content!.ReadAsStringAsync();

            OutputHelper.WriteLine("pdf request content:");
            OutputHelper.WriteLine(content);
            OutputHelper.WriteLine("");

            using var document = JsonDocument.Parse(content);
            document.RootElement.GetProperty("url").GetString().Should().Contain($"lang={language}");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        // both "?lang" and "?language" should work
        var nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={language}",
            null
        );
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RunProcessNext_VerifyUpdatePresentationTextsAndDataValues()
    {
        // Pre-assert that pretest does not contain presentation texts or data values
        var initialInstance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        Assert.Null(initialInstance.DataValues);
        Assert.Null(initialInstance.PresentationTexts);

        // Setup pdf mock to avoid failing due to pof service not running.
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(pdfMock.Object);
        };

        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Post assert that after process next the instance contains presentation texts and data values
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        Assert.Equal(new Dictionary<string, string>() { ["tag-with-attribute"] = "tagvalue" }, instance.DataValues);
        Assert.Equal(new Dictionary<string, string>() { ["Navn"] = "Per Olsen" }, instance.PresentationTexts);
    }

    [Fact]
    public async Task RunProcessNext_FailingValidator_ReturnsValidationErrors()
    {
        var dataValidator = new Mock<IFormDataValidator>(MockBehavior.Strict);
        dataValidator.SetupGet(v => v.NoIncrementalValidation).Returns(false);
        dataValidator.SetupGet(v => v.ShouldRunAfterRemovingHiddenData).Returns(false);
        dataValidator.Setup(v => v.DataType).Returns("*");
        dataValidator.Setup(v => v.ValidationSource).Returns("test-source");
        dataValidator
            .Setup(v =>
                v.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync(
                new List<ValidationIssue>
                {
                    new()
                    {
                        Code = "test-code",
                        Description = "test-description",
                        Severity = ValidationIssueSeverity.Error,
                    },
                }
            );
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(dataValidator.Object);
            services.AddTelemetrySink(
                additionalActivitySources: source => source.Name == "Microsoft.AspNetCore",
                additionalMeters: source => source.Name == "Microsoft.AspNetCore.Hosting",
                filterMetrics: metric => metric.Name == "http.server.request.duration"
            );
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using var document = JsonDocument.Parse(nextResponseContent);
        var issues = document.RootElement.GetProperty("validationIssues").EnumerateArray().ToList();
        issues
            .Should()
            .ContainSingle(p =>
                p.GetProperty("source").GetString() == "test-source"
                && p.GetProperty("description").GetString() == "test-description"
            );

        // Verify that the instance is not updated
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.Should().NotBeNull();
        instance.Process.CurrentTask!.ElementId.Should().Be("Task_1");

        await Verify(await GetTelemetrySnapshot(numberOfActivities: 1, numberOfMetrics: 1));
    }

    [Fact]
    public async Task RunProcessNext_FailingValidator_Reject_ReturnsOk()
    {
        var dataValidator = new Mock<IFormDataValidator>(MockBehavior.Strict);
        dataValidator.SetupGet(v => v.NoIncrementalValidation).Returns(false);
        dataValidator.Setup(v => v.DataType).Returns("*");
        dataValidator.Setup(v => v.ValidationSource).Returns("test-source");
        dataValidator
            .Setup(v =>
                v.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync(
                new List<ValidationIssue>
                {
                    new()
                    {
                        Code = "test-code",
                        Description = "test-description",
                        Severity = ValidationIssueSeverity.Error,
                    },
                }
            );

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(dataValidator.Object);
            services.AddTelemetrySink(
                additionalActivitySources: source => source.Name == "Microsoft.AspNetCore",
                additionalMeters: source => source.Name == "Microsoft.AspNetCore.Hosting",
                filterMetrics: metric => metric.Name == "http.server.request.duration"
            );
        };

        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        string processNextWithReject = JsonSerializer.Serialize(
            new ProcessNext() { Action = "reject" },
            _jsonSerializerOptions
        );

        using var processNextWithRejectStringContent = new StringContent(
            processNextWithReject,
            Encoding.UTF8,
            "application/json"
        );

        var nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next",
            processNextWithRejectStringContent
        );

        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
        using var document = JsonDocument.Parse(nextResponseContent);
        document.RootElement.EnumerateObject().Should().NotContain(p => p.Name == "validationIssues");

        var telemetry = this.Services.GetRequiredService<TelemetrySink>();
        // Verify that the instance is updated to the ended state
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.Should().BeNull();
        instance.Process.EndEvent.Should().Be("EndEvent_1");

        await telemetry.WaitForServerTelemetry();
        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task RunProcessNext_DataFromHiddenComponents_GetsRemoved()
    {
        // Override config to remove hidden data
        OverrideAppSetting("AppSettings:RemoveHiddenData", "true");

        // Mock pdf generation so that the test does not fail due to pof service not running.
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(pdfMock.Object);
        };
        // setup data processor
        _dataProcessorMock
            .Setup(dp =>
                dp.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    _dataGuid,
                    It.IsAny<Skjema>(),
                    It.IsAny<Skjema>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);

        // create client for tests
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        var dataPath = TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _dataGuid);

        // Update hidden data value
        var serializedPatch = JsonSerializer.Serialize(
            new DataPatchRequest()
            {
                Patch = new JsonPatch(
                    PatchOperation.Add(
                        JsonPointer.Create("melding", "hidden"),
                        JsonNode.Parse("\"value that is hidden\"")
                    ),
                    PatchOperation.Add(
                        JsonPointer.Create("melding", "hiddenNotRemove"),
                        JsonNode.Parse("\"value that is not removed\"")
                    ),
                    PatchOperation.Add(
                        JsonPointer.Create("melding", "hiddenPage"),
                        JsonNode.Parse("\"HiddenPage to be removed\"")
                    ),
                    PatchOperation.Add(
                        JsonPointer.Create("melding", "hiddenPageNotRemove"),
                        JsonNode.Parse("\"HiddenPageNotRemove to not be removed\"")
                    )
                ),
                IgnoredValidators = [],
            },
            _jsonSerializerOptions
        );
        OutputHelper.WriteLine(serializedPatch);
        using var updateDataElementContent = new StringContent(serializedPatch, Encoding.UTF8, "application/json");
        using var response = await client.PatchAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}",
            updateDataElementContent
        );
        response.Should().HaveStatusCode(HttpStatusCode.OK);

        // Verify that hidden is stored
        var dataString = await File.ReadAllTextAsync(dataPath);
        OutputHelper.WriteLine("Data before process next:");
        OutputHelper.WriteLine(dataString);
        dataString.Should().Contain("<hidden>value that is hidden</hidden>");
        dataString.Should().Contain("<hiddenNotRemove>value that is not removed</hiddenNotRemove>");
        dataString.Should().Contain("<hiddenPage>HiddenPage to be removed</hiddenPage>");
        dataString.Should().Contain("<hiddenPageNotRemove>HiddenPageNotRemove to not be removed</hiddenPageNotRemove>");

        // Run process next
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Verify that the instance is updated to the ended state
        dataString = await File.ReadAllTextAsync(dataPath);
        OutputHelper.WriteLine("Data after process next:");
        OutputHelper.WriteLine(dataString);
        dataString.Should().NotContain("<hidden>value that is hidden</hidden>");
        dataString.Should().Contain("<hiddenNotRemove>value that is not removed</hiddenNotRemove>");
        dataString.Should().NotContain("<hiddenPage>HiddenPage to be removed</hiddenPage>");
        dataString.Should().Contain("<hiddenPageNotRemove>HiddenPageNotRemove to not be removed</hiddenPageNotRemove>");

        _dataProcessorMock.Verify();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("copyDataType")]
    public async Task RunProcessNext_ShadowFields_GetsRemoved(string? saveToDataType)
    {
        // Mock pdf generation so that the test does not fail due to pof service not running.
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(pdfMock.Object);
            services.AddSingleton(
                new AppMetadataMutationHook(appMetadata =>
                {
                    var defaultDataType = appMetadata.DataTypes.Single(dt => dt.Id == "default");
                    defaultDataType.AppLogic.ShadowFields = new() { Prefix = "SF_", SaveToDataType = saveToDataType };

                    if (saveToDataType is not null)
                        appMetadata.DataTypes.Add(
                            new DataType()
                            {
                                Id = saveToDataType,
                                TaskId = "Task_1",
                                AppLogic = new() { ClassRef = defaultDataType.AppLogic.ClassRef },
                            }
                        );
                })
            );
        };
        // setup data processor
        _dataProcessorMock
            .Setup(dp =>
                dp.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    _dataGuid,
                    It.IsAny<Skjema>(),
                    It.IsAny<Skjema>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);

        // create client for tests
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        // Update hidden data value
        var serializedPatch = JsonSerializer.Serialize(
            new DataPatchRequest()
            {
                Patch = new JsonPatch(
                    PatchOperation.Add(
                        JsonPointer.Create("melding", "SF_test"),
                        JsonNode.Parse("\"value that is in shadow field\"")
                    )
                ),
                IgnoredValidators = [],
            },
            _jsonSerializerOptions
        );
        OutputHelper.WriteLine(serializedPatch);
        using var updateDataElementContent = new StringContent(serializedPatch, Encoding.UTF8, "application/json");
        using var response = await client.PatchAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/data/{_dataGuid}",
            updateDataElementContent
        );
        response.Should().HaveStatusCode(HttpStatusCode.OK);

        // Verify that hidden is stored
        var dataPath = TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _dataGuid);
        var dataString = await File.ReadAllTextAsync(dataPath);
        OutputHelper.WriteLine("Data before process next:");
        OutputHelper.WriteLine(dataString);
        dataString.Should().Contain("<SF_test>value that is in shadow field</SF_test>");

        // Run process next
        using var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Get data path if the data element with shadow fields removed is saved to another data type
        if (saveToDataType is not null)
        {
            var instanceClient = Services.GetRequiredService<IInstanceClient>();
            var instance = await instanceClient.GetInstance(
                App,
                Org,
                InstanceOwnerPartyId,
                _instanceGuid,
                authenticationMethod: null,
                CancellationToken.None
            );
            var copyDataGuid = Guid.Parse(instance.Data.Single(de => de.DataType == saveToDataType).Id);
            dataPath = TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, copyDataGuid);
        }
        // Verify that the instance is updated to the ended state
        dataString = await File.ReadAllTextAsync(dataPath);
        OutputHelper.WriteLine("Data after process next:");
        OutputHelper.WriteLine(dataString);
        dataString.Should().NotContain("<SF_test>value that is in shadow field</SF_test>");

        _dataProcessorMock.Verify();
    }

    [Fact]
    public async Task RunProcessNext_NonErrorValidations_ReturnsOk()
    {
        var dataValidator = new Mock<IFormDataValidator>(MockBehavior.Strict);
        dataValidator.SetupGet(v => v.NoIncrementalValidation).Returns(false);
        dataValidator.SetupGet(v => v.ShouldRunAfterRemovingHiddenData).Returns(false);
        dataValidator.Setup(v => v.DataType).Returns("*");
        dataValidator.Setup(v => v.ValidationSource).Returns("test-source");
        dataValidator
            .Setup(v =>
                v.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync(
                new List<ValidationIssue>
                {
                    new()
                    {
                        Code = "test-success",
                        Description = "test-success-description",
                        Severity = ValidationIssueSeverity.Success,
                    },
                    new()
                    {
                        Code = "test-fixed",
                        Description = "test-fixed-description",
                        Severity = ValidationIssueSeverity.Fixed,
                    },
                    new()
                    {
                        Code = "test-informational",
                        Description = "test-informational-description",
                        Severity = ValidationIssueSeverity.Informational,
                    },
                    new()
                    {
                        Code = "test-warning",
                        Description = "test-warning-description",
                        Severity = ValidationIssueSeverity.Warning,
                    },
                }
            );
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(dataValidator.Object);
            services.AddSingleton(pdfMock.Object);
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
        using var document = JsonDocument.Parse(nextResponseContent);
        document.RootElement.EnumerateObject().Should().NotContain(p => p.Name == "validationIssues");

        // Verify that the instance is updated to the ended state
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.Should().BeNull();
        instance.Process.EndEvent.Should().Be("EndEvent_1");
    }

    [Fact]
    public async Task RunCompleteTask_GoesToEndEvent()
    {
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(pdfMock.Object);
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/completeProcess", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Verify that the instance is updated to the ended state
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.Should().BeNull();
        instance.Process.EndEvent.Should().Be("EndEvent_1");
    }

    [Fact]
    public async Task RunCompleteProcess_TwoTasks_CarriesVersionsAndEndsProcess()
    {
        const string org = "ttd";
        const string app = "process-version-admission";
        const int instanceOwnerPartyId = 501337;
        var instanceGuid = new Guid("d2af1cfd-db99-45f9-9625-9dfa1223485f");
        var instanceId = $"{instanceOwnerPartyId}/{instanceGuid}";

        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);
        var storageMetadata = new ApiTestStorageMetadata();
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IFormDataValidator>();
            services.Replace(ServiceDescriptor.Singleton(storageMetadata));
        };
        int initialProcessStateVersion = storageMetadata.GetVersions(instanceId).ProcessStateVersion!.Value;

        using var client = GetRootedUserClient(org, app);
        using var response = await client.PutAsync($"{org}/{app}/instances/{instanceId}/process/completeProcess", null);
        var responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        var processState = JsonSerializer.Deserialize<AppProcessState>(responseContent, _jsonSerializerOptions);
        processState.Should().NotBeNull();
        processState!.CurrentTask.Should().BeNull();
        processState.EndEvent.Should().Be("EndEvent_1");

        var instance = await TestData.GetInstance(org, app, instanceOwnerPartyId, instanceGuid);
        instance.Process.CurrentTask.Should().BeNull();
        instance.Process.EndEvent.Should().Be("EndEvent_1");
        storageMetadata.AggregateMutationRequestCount.Should().BeGreaterThanOrEqualTo(2);
        storageMetadata.GetVersions(instanceId).ProcessStateVersion.Should().BeGreaterThan(initialProcessStateVersion);
    }

    [Fact]
    public async Task RunNextWithAction_WhenActionIsNotDefinedInBpmn_ReturnsOk()
    {
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(pdfMock.Object);
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        using var content = new StringContent(
            """{"action": "unknown-action_not_in_bpmn_task"}""",
            Encoding.UTF8,
            "application/json"
        );
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", content);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Verify that the instance is updated to the ended state
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.Should().BeNull();
        instance.Process.EndEvent.Should().Be("EndEvent_1");
    }

    [Fact]
    public async Task RunNextWithAction_WhenActionIsNotAuthorized_ReturnsUnauthorized()
    {
        var pdfMock = SetupPdfGeneratorMock();
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(pdfMock.Object);
        };
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, ProcessStatus.Processing);
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        using var content = new StringContent(
            """{"action": "action_defined_in_bpmn_but_unauthorized"}""",
            Encoding.UTF8,
            "application/json"
        );
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", content);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ProcessHistory_ShouldReturnProcessHistory()
    {
        var start = "2024-10-16T10:33:54.935732Z";
        var processList = new ProcessHistoryList()
        {
            ProcessHistory = [new() { ElementId = "Task_1", Started = DateTime.Parse(start).ToUniversalTime() }],
        };
        SendAsync = message =>
        {
            ArgumentNullException.ThrowIfNull(message.RequestUri);
            message
                .RequestUri.PathAndQuery.Should()
                .Be($"/storage/api/v1/instances/{InstanceOwnerPartyId}/{_instanceGuid}/process/history");
            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonConvert.SerializeObject(processList)), // Api uses Newtonsoft.Json
                }
            );
        };
        HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        string url = $"/{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/process/history";

        HttpResponseMessage response = await client.GetAsync(url);

        var content = await response.Content.ReadAsStringAsync();

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        content
            .Should()
            .Be(
                $$"""{"processHistory":[{"eventType":null,"elementId":"Task_1","occured":null,"started":"{{start}}","ended":null,"performedBy":null}]}"""
            );
    }

    [Fact]
    public async Task StartProcess_WhenWorkflowExecutionFails_ReturnsWorkflowFailedProblemDetails()
    {
        // Arrange: the workflow engine accepts the process start but the workflow then fails after the
        // process state may already have changed in Storage.
        var instance = new Instance
        {
            Id = _instanceId,
            AppId = $"{Org}/{App}",
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
        };
        var workflowFailure = new Altinn.App.Core.Models.Process.WorkflowFailure
        {
            Kind = Altinn.App.Core.Models.Process.WorkflowFailureKind.StepFailed,
            StepOperationId = "StartTask",
            LastError = new Altinn.App.Core.Models.Process.WorkflowFailureError
            {
                Message = "Simulated workflow callback failure.",
            },
        };

        Mock<Altinn.App.Core.Internal.Process.IProcessEngine> processEngineMock = CreateProcessEngineThrowingOnSubmit(
            new Altinn.App.Core.Internal.WorkflowEngine.WorkflowExecutionFailedException(
                instance,
                workflowFailure,
                processStateChanged: true,
                "Process workflow execution failed."
            )
        );
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        // Act
        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/start",
            null
        );
        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);

        // Assert: the endpoint surfaces the same structured recovery contract as instantiation instead of a bare 500.
        response.Should().HaveStatusCode(HttpStatusCode.InternalServerError);
        using JsonDocument document = JsonDocument.Parse(responseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("title").GetString().Should().Be("Process start failed.");
        root.GetProperty("initializationState").GetString().Should().Be("workflowFailed");
        root.GetProperty("recommendedAction").GetString().Should().Be("resumeCurrentTask");
        root.GetProperty("workflowAccepted").GetBoolean().Should().BeTrue();
        root.GetProperty("processStateChanged").GetBoolean().Should().BeTrue();
        root.GetProperty("detail").GetString().Should().Contain("call the resume endpoint");
        JsonElement resumeEndpoint = root.GetProperty("resumeEndpoint");
        resumeEndpoint.GetProperty("method").GetString().Should().Be("POST");
        resumeEndpoint
            .GetProperty("path")
            .GetString()
            .Should()
            .Be($"/{Org}/{App}/instances/{_instanceId}/process/resume");
        // Literal, not WorkflowFailureKind.StepFailed.ToString(), so renaming the enum member fails this test.
        root.GetProperty("workflowFailure").GetProperty("kind").GetString().Should().Be("stepFailed");
    }

    [Fact]
    public async Task NextElement_WhenAcquireFails_ReturnsConflictWithRefreshMeaning()
    {
        var workflowFailure = new Altinn.App.Core.Models.Process.WorkflowFailure
        {
            Kind = Altinn.App.Core.Models.Process.WorkflowFailureKind.AcquireConflict,
            StepOperationId = "AcquireProcessingStatus",
            LastError = new Altinn.App.Core.Models.Process.WorkflowFailureError
            {
                Message = "The captured instance version is stale.",
                HttpStatusCode = StatusCodes.Status409Conflict,
                WasRetryable = false,
            },
        };
        var processEngineMock = new Mock<Altinn.App.Core.Internal.Process.IProcessEngine>(MockBehavior.Strict);
        processEngineMock
            .Setup(engine =>
                engine.Next(
                    It.IsAny<Altinn.App.Core.Models.Process.ProcessNextRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new Altinn.App.Core.Models.Process.ProcessChangeResult
                {
                    Success = false,
                    ErrorType = Altinn.App.Core.Models.Process.ProcessErrorType.Conflict,
                    ErrorMessage =
                        "The instance changed before the process transition could start. Refresh the instance and try again.",
                    WorkflowFailure = workflowFailure,
                }
            );
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next",
            null
        );
        string responseContent = await response.Content.ReadAsStringAsync();

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using JsonDocument document = JsonDocument.Parse(responseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("detail").GetString().Should().Contain("Refresh");
        root.GetProperty("workflowFailure").GetProperty("kind").GetString().Should().Be("acquireConflict");
        root.TryGetProperty("processNextState", out _).Should().BeFalse();
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task NextElement_WhenProcessStatusBlocks_ReturnsSharedProblem(ProcessStatus processStatus)
    {
        var processEngineMock = new Mock<Altinn.App.Core.Internal.Process.IProcessEngine>(MockBehavior.Strict);
        processEngineMock
            .Setup(engine =>
                engine.Next(
                    It.IsAny<Altinn.App.Core.Models.Process.ProcessNextRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new Altinn.App.Core.Models.Process.ProcessChangeResult
                {
                    Success = false,
                    ErrorType = Altinn.App.Core.Models.Process.ProcessErrorType.Conflict,
                    ErrorTitle = "Instance mutation blocked.",
                    ErrorMessage = $"The instance cannot be changed while its process status is '{processStatus}'.",
                    BlockingProcessStatus = processStatus,
                }
            );
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next",
            null
        );

        await ProcessStatusProblemAssertions.AssertResponse(response, processStatus);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task CompleteProcess_WhenStoredProcessStatusBlocks_ReturnsSharedProblemBeforeAppCode(
        ProcessStatus processStatus
    )
    {
        var workflowEngineService = CreateWorkflowEngineServiceMock(new CurrentTaskWorkflowState.Unblocked());
        var action = CreateStrictCompleteActionMock();
        var authorizer = CreateCompleteAuthorizerMock("write");
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(action.Object);
        };
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, processStatus);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
            null
        );

        await ProcessStatusProblemAssertions.AssertResponse(response, processStatus);
        workflowEngineService.Verify(
            service =>
                service.GetCurrentTaskWorkflowState(
                    It.Is<Instance>(instance => instance.Id == _instanceId),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        workflowEngineService.VerifyNoOtherCalls();
        VerifyCompleteAuthorizations(authorizer, "write", completeAuthorizationExpected: false);
        VerifyAppCodeWasNotInvoked(action);
    }

    [Theory]
    [InlineData("retrying")]
    [InlineData("resumeRequired")]
    public async Task CompleteProcess_WorkflowRecoveryDispositionWinsOverStoredProcessStatus(
        string expectedProcessNextState
    )
    {
        Guid workflowId = Guid.NewGuid();
        CurrentTaskWorkflowState workflowState = expectedProcessNextState switch
        {
            "retrying" => new CurrentTaskWorkflowState.Retrying(workflowId, "collection-key"),
            "resumeRequired" => new CurrentTaskWorkflowState.ResumeRequired(workflowId, "collection-key"),
            _ => throw new ArgumentOutOfRangeException(nameof(expectedProcessNextState)),
        };
        var workflowEngineService = CreateWorkflowEngineServiceMock(workflowState);
        var action = CreateStrictCompleteActionMock();
        var authorizer = CreateCompleteAuthorizerMock("write");
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(action.Object);
        };
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, ProcessStatus.Processing);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
            null
        );

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using JsonDocument document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        document.RootElement.GetProperty("processNextState").GetString().Should().Be(expectedProcessNextState);
        document.RootElement.TryGetProperty("processStatus", out _).Should().BeFalse();
        workflowEngineService.Verify(
            service =>
                service.GetCurrentTaskWorkflowState(
                    It.Is<Instance>(instance => instance.Id == _instanceId),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        workflowEngineService.VerifyNoOtherCalls();
        VerifyCompleteAuthorizations(authorizer, "write", completeAuthorizationExpected: false);
        VerifyAppCodeWasNotInvoked(action);
    }

    [Theory]
    [InlineData(AltinnTaskTypes.Payment, "payment")]
    [InlineData(AltinnTaskTypes.SubformPdf, "subformPdf")]
    public async Task CompleteProcess_WhenLegacyTaskTypeAuthorizationDiffers_ReturnsBareForbidden(
        string taskType,
        string action
    )
    {
        var workflowEngineService = CreateWorkflowEngineServiceMock(new CurrentTaskWorkflowState.Unblocked());
        var authorizer = CreateCompleteAuthorizerMock(action, completeProcessAuthorized: false);
        var userAction = CreateStrictCompleteActionMock(action);
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(userAction.Object);
        };
        await TestData.SetCurrentTaskType(Org, App, InstanceOwnerPartyId, _instanceGuid, taskType);
        try
        {
            using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

            using HttpResponseMessage response = await client.PutAsync(
                $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
                null
            );

            response.Should().HaveStatusCode(HttpStatusCode.Forbidden);
            response.Content.Headers.ContentType.Should().BeNull();
            (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
            VerifyCompleteAuthorizations(authorizer, action, completeAuthorizationExpected: true);
            workflowEngineService.Verify(
                service =>
                    service.GetCurrentTaskWorkflowState(
                        It.Is<Instance>(instance => instance.Id == _instanceId),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
            workflowEngineService.VerifyNoOtherCalls();
            VerifyAppCodeWasNotInvoked(userAction);
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        }
    }

    [Fact]
    public async Task CompleteProcess_WhenActionAndLegacyAuthorizationDeny_ReturnsBareForbidden()
    {
        var workflowEngineService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        var authorizer = CreateCompleteAuthorizerMock(
            "write",
            completeProcessAuthorized: false,
            actionAuthorized: false
        );
        var validationService = new Mock<IValidationService>(MockBehavior.Strict);
        var action = CreateStrictCompleteActionMock();
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.RemoveAll<IValidationService>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(validationService.Object);
            services.AddSingleton(action.Object);
        };
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, ProcessStatus.Idle);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
            null
        );

        response.Should().HaveStatusCode(HttpStatusCode.Forbidden);
        response.Content.Headers.ContentType.Should().BeNull();
        (await response.Content.ReadAsStringAsync()).Should().BeEmpty();
        VerifyCompleteAuthorizations(authorizer, "write", completeAuthorizationExpected: true);
        workflowEngineService.VerifyNoOtherCalls();
        validationService.VerifyNoOtherCalls();
        VerifyAppCodeWasNotInvoked(action);
    }

    [Fact]
    public async Task CompleteProcess_WhenOnlyActionAuthorizationDenies_ReturnsEngineUnauthorizedProblem()
    {
        var workflowEngineService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        var authorizer = CreateCompleteAuthorizerMock(
            "write",
            completeProcessAuthorized: true,
            actionAuthorized: false
        );
        var validationService = new Mock<IValidationService>(MockBehavior.Strict);
        var action = CreateStrictCompleteActionMock();
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.RemoveAll<IValidationService>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(validationService.Object);
            services.AddSingleton(action.Object);
        };
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, ProcessStatus.Idle);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
            null
        );

        response.Should().HaveStatusCode(HttpStatusCode.Forbidden);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        using JsonDocument document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        document.RootElement.GetProperty("status").GetInt32().Should().Be(StatusCodes.Status403Forbidden);
        document.RootElement.GetProperty("title").GetString().Should().Be("Unauthorized");
        document
            .RootElement.GetProperty("detail")
            .GetString()
            .Should()
            .Contain("User is not authorized to perform process next.");
        VerifyCompleteAuthorizations(authorizer, "write", completeAuthorizationExpected: true);
        workflowEngineService.VerifyNoOtherCalls();
        validationService.VerifyNoOtherCalls();
        VerifyAppCodeWasNotInvoked(action);
    }

    [Fact]
    public async Task CompleteProcess_WhenIdleAndValidationFails_StopsMatchingActionBeforeAppCode()
    {
        var workflowEngineService = CreateWorkflowEngineServiceMock(new CurrentTaskWorkflowState.Unblocked());
        var authorizer = CreateCompleteAuthorizerMock("write", completeProcessAuthorized: true);
        var action = CreateStrictCompleteActionMock();
        var dataValidator = new Mock<IFormDataValidator>(MockBehavior.Strict);
        dataValidator.SetupGet(validator => validator.NoIncrementalValidation).Returns(false);
        dataValidator.SetupGet(validator => validator.ShouldRunAfterRemovingHiddenData).Returns(false);
        dataValidator.SetupGet(validator => validator.DataType).Returns("*");
        dataValidator.SetupGet(validator => validator.ValidationSource).Returns("complete-validation");
        dataValidator
            .Setup(validator =>
                validator.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string?>()
                )
            )
            .ReturnsAsync([
                new ValidationIssue
                {
                    Code = "complete-validation-error",
                    Description = "Complete validation failed.",
                    Severity = ValidationIssueSeverity.Error,
                },
            ]);
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(action.Object);
            services.RemoveAll<IFormDataValidator>();
            services.AddSingleton(dataValidator.Object);
        };
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, ProcessStatus.Idle);
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
            null
        );

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using JsonDocument document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        JsonElement issue = document.RootElement.GetProperty("validationIssues").EnumerateArray().Single();
        issue.GetProperty("source").GetString().Should().Be("complete-validation");
        issue.GetProperty("code").GetString().Should().Be("complete-validation-error");
        dataValidator.Verify(
            validator =>
                validator.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string?>()
                ),
            Times.Once
        );
        workflowEngineService.Verify(
            service =>
                service.GetCurrentTaskWorkflowState(
                    It.Is<Instance>(instance => instance.Id == _instanceId),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        workflowEngineService.VerifyNoOtherCalls();
        VerifyCompleteAuthorizations(authorizer, "write", completeAuthorizationExpected: true);
        VerifyAppCodeWasNotInvoked(action);
    }

    [Fact]
    public async Task CompleteProcess_WhenServiceTaskValidationFails_StopsBeforeActionAndServiceEffects()
    {
        const string serviceType = "test-service";
        var workflowEngineService = CreateWorkflowEngineServiceMock(new CurrentTaskWorkflowState.Unblocked());
        var authorizer = CreateCompleteAuthorizerMock(serviceType, completeProcessAuthorized: true);
        var validationService = CreateValidationServiceMock([
            new ValidationIssueWithSource
            {
                Severity = ValidationIssueSeverity.Error,
                Code = "service-invalid",
                Description = "Service task validation failed.",
                Source = "service-validation",
            },
        ]);
        var action = CreateStrictCompleteActionMock(serviceType);
        // A real class, not a mock: resolving the task's pipeline goes through the forwarding
        // Define default, which mocks bypass.
        var serviceTask = new RecordingServiceTask(serviceType);
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IWorkflowEngineService>();
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.RemoveAll<IValidationService>();
            services.AddSingleton(workflowEngineService.Object);
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(validationService.Object);
            services.AddSingleton(action.Object);
            services.AddSingleton<IServiceTask>(serviceTask);
        };
        await TestData.SetCurrentTaskType(Org, App, InstanceOwnerPartyId, _instanceGuid, serviceType);
        try
        {
            using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

            using HttpResponseMessage response = await client.PutAsync(
                $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
                null
            );

            response.Should().HaveStatusCode(HttpStatusCode.Conflict);
            using JsonDocument document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            JsonElement issue = document.RootElement.GetProperty("validationIssues").EnumerateArray().Single();
            issue.GetProperty("source").GetString().Should().Be("service-validation");
            issue.GetProperty("code").GetString().Should().Be("service-invalid");
            VerifyCompleteAuthorizations(authorizer, serviceType, completeAuthorizationExpected: true);
            VerifyValidationCalls(validationService, Times.Once());
            action.Verify(userAction => userAction.HandleAction(It.IsAny<UserActionContext>()), Times.Never);
            action.VerifyNoOtherCalls();
            Assert.Equal(0, serviceTask.ExecuteCount);
            workflowEngineService.Verify(
                service =>
                    service.GetCurrentTaskWorkflowState(
                        It.Is<Instance>(instance => instance.Id == _instanceId),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
            workflowEngineService.VerifyNoOtherCalls();
        }
        finally
        {
            TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        }
    }

    [Fact]
    public async Task CompleteProcess_WhenValid_PrevalidatesThenRunsActionThenPostvalidates()
    {
        List<string> callOrder = [];
        var authorizer = CreateCompleteAuthorizerMock("write", completeProcessAuthorized: true);
        var validationService = CreateValidationServiceMock([], () => callOrder.Add("validate"));
        var action = CreateStrictCompleteActionMock();
        action
            .Setup(userAction => userAction.HandleAction(It.IsAny<UserActionContext>()))
            .Callback(() => callOrder.Add("action"))
            .ReturnsAsync(UserActionResult.SuccessResult());
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IProcessEngineAuthorizer>();
            services.RemoveAll<IValidationService>();
            services.AddSingleton(authorizer.Object);
            services.AddSingleton(validationService.Object);
            services.AddSingleton(action.Object);
        };
        using HttpClient client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/completeProcess",
            null
        );

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        callOrder.Should().Equal("validate", "action", "validate");
        VerifyCompleteAuthorizations(authorizer, "write", completeAuthorizationExpected: true);
        VerifyValidationCalls(validationService, Times.Exactly(2));
        action.VerifyGet(userAction => userAction.Id, Times.Once);
        action.Verify(userAction => userAction.HandleAction(It.IsAny<UserActionContext>()), Times.Once);
        action.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NextElement_WhenEngineRejectsDifferentBodyForSameVersionKey_ReturnsConflict()
    {
        var processEngineMock = new Mock<Altinn.App.Core.Internal.Process.IProcessEngine>(MockBehavior.Strict);
        processEngineMock
            .Setup(engine =>
                engine.Next(
                    It.IsAny<Altinn.App.Core.Models.Process.ProcessNextRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(
                Altinn.App.Core.Internal.WorkflowEngine.WorkflowSubmissionFailedException.NotAccepted(
                    "Engine idempotency conflict.",
                    HttpStatusCode.Conflict,
                    _instanceGuid.ToString()
                )
            );
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next",
            null
        );
        string responseContent = await response.Content.ReadAsStringAsync();

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using JsonDocument document = JsonDocument.Parse(responseContent);
        document.RootElement.GetProperty("title").GetString().Should().Be("Concurrent process transition attempt.");
        document.RootElement.GetProperty("detail").GetString().Should().Contain("Refresh");
    }

    [Fact]
    public async Task StartProcess_WhenAcquireFails_ReturnsConflictWithoutResume()
    {
        var instance = new Instance
        {
            Id = _instanceId,
            AppId = $"{Org}/{App}",
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
        };
        var workflowFailure = new Altinn.App.Core.Models.Process.WorkflowFailure
        {
            Kind = Altinn.App.Core.Models.Process.WorkflowFailureKind.AcquireConflict,
            StepOperationId = "AcquireProcessingStatus",
        };
        Mock<Altinn.App.Core.Internal.Process.IProcessEngine> processEngineMock = CreateProcessEngineThrowingOnSubmit(
            new Altinn.App.Core.Internal.WorkflowEngine.WorkflowExecutionFailedException(
                instance,
                workflowFailure,
                processStateChanged: false,
                "Acquire conflict."
            )
        );
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/start",
            null
        );
        string responseContent = await response.Content.ReadAsStringAsync();

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using JsonDocument document = JsonDocument.Parse(responseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("recommendedAction").GetString().Should().Be("retryStartProcess");
        root.GetProperty("detail").GetString().Should().Contain("Refresh");
        root.GetProperty("workflowFailure").GetProperty("kind").GetString().Should().Be("acquireConflict");
        root.TryGetProperty("resumeEndpoint", out _).Should().BeFalse();
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task StartProcess_WhenProcessStatusBlocks_ReturnsSharedProblemBeforeEngine(ProcessStatus processStatus)
    {
        await TestData.SetProcessStatus(Org, App, InstanceOwnerPartyId, _instanceGuid, processStatus);
        var processEngineMock = new Mock<Altinn.App.Core.Internal.Process.IProcessEngine>(MockBehavior.Strict);
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/start",
            null
        );

        await ProcessStatusProblemAssertions.AssertResponse(response, processStatus);
        processEngineMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task StartProcess_WhenEngineRejectsDifferentBodyForSameVersionKey_ReturnsConflictWithoutResume()
    {
        Mock<Altinn.App.Core.Internal.Process.IProcessEngine> processEngineMock = CreateProcessEngineThrowingOnSubmit(
            Altinn.App.Core.Internal.WorkflowEngine.WorkflowSubmissionFailedException.NotAccepted(
                "Engine idempotency conflict.",
                HttpStatusCode.Conflict,
                _instanceGuid.ToString()
            )
        );
        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/start",
            null
        );
        string responseContent = await response.Content.ReadAsStringAsync();

        response.Should().HaveStatusCode(HttpStatusCode.Conflict);
        using JsonDocument document = JsonDocument.Parse(responseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("recommendedAction").GetString().Should().Be("inspectInstance");
        root.GetProperty("detail").GetString().Should().Contain("Refresh");
        root.TryGetProperty("resumeEndpoint", out _).Should().BeFalse();
    }

    // Pins the wire strings of the process-start submission-failure contract. NotAccepted leaves the existing
    // instance untouched so the client can retry the start; Unknown is indeterminate so the client must inspect.
    [Theory]
    [InlineData(true, "workflowNotAccepted", "retryStartProcess", "notAccepted")]
    [InlineData(false, "workflowAcceptanceUnknown", "inspectInstance", "unknown")]
    public async Task StartProcess_WhenWorkflowSubmissionFails_ReturnsProblemDetailsWithoutResume(
        bool notAccepted,
        string expectedState,
        string expectedAction,
        string expectedFailureKind
    )
    {
        // Arrange
        var submissionException = notAccepted
            ? Altinn.App.Core.Internal.WorkflowEngine.WorkflowSubmissionFailedException.NotAccepted(
                "Simulated workflow rejection."
            )
            : Altinn.App.Core.Internal.WorkflowEngine.WorkflowSubmissionFailedException.Unknown(
                "Simulated unknown acceptance state."
            );
        Mock<Altinn.App.Core.Internal.Process.IProcessEngine> processEngineMock = CreateProcessEngineThrowingOnSubmit(
            submissionException
        );

        using HttpClient client = GetClientWithProcessEngine(processEngineMock);

        // Act
        using HttpResponseMessage response = await client.PostAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/start",
            null
        );
        string responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);

        // Assert
        response.Should().HaveStatusCode(HttpStatusCode.InternalServerError);
        using JsonDocument document = JsonDocument.Parse(responseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("title").GetString().Should().Be("Process start failed.");
        root.GetProperty("initializationState").GetString().Should().Be(expectedState);
        root.GetProperty("recommendedAction").GetString().Should().Be(expectedAction);
        // Asserted against a literal, not Kind.ToString(), so an enum rename is caught as a contract break.
        root.GetProperty("workflowSubmissionFailureKind").GetString().Should().Be(expectedFailureKind);
        // Submission never reached execution, so there is nothing to resume.
        root.TryGetProperty("resumeEndpoint", out _).Should().BeFalse();
        root.TryGetProperty("workflowFailure", out _).Should().BeFalse();
    }

    private Mock<Altinn.App.Core.Internal.Process.IProcessEngine> CreateProcessEngineThrowingOnSubmit(
        Exception submitException
    )
    {
        var processEngineMock = new Mock<Altinn.App.Core.Internal.Process.IProcessEngine>();
        processEngineMock
            .Setup(p => p.CreateInitialProcessState(It.IsAny<Altinn.App.Core.Models.Process.ProcessStartRequest>()))
            .ReturnsAsync(
                new Altinn.App.Core.Models.Process.ProcessChangeResult
                {
                    Success = true,
                    ProcessStateChange = new Altinn.App.Core.Models.Process.ProcessStateChange(),
                }
            );
        processEngineMock
            .Setup(p =>
                p.SubmitInitialProcessState(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<Altinn.App.Core.Models.Process.ProcessStateChange>(),
                    It.IsAny<bool>(),
                    It.IsAny<Dictionary<string, string>?>(),
                    It.IsAny<Altinn.App.Core.Models.Notifications.Future.InstantiationNotification?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(submitException);
        return processEngineMock;
    }

    private HttpClient GetClientWithProcessEngine(
        Mock<Altinn.App.Core.Internal.Process.IProcessEngine> processEngineMock
    ) =>
        GetRootedUserClient(
            Org,
            App,
            1337,
            InstanceOwnerPartyId,
            configureServices: services =>
            {
                services.RemoveAll<Altinn.App.Core.Internal.Process.IProcessEngine>();
                services.AddSingleton(processEngineMock.Object);
            }
        );

    private static Mock<IWorkflowEngineService> CreateWorkflowEngineServiceMock(CurrentTaskWorkflowState workflowState)
    {
        var workflowEngineService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        workflowEngineService
            .Setup(service => service.GetCurrentTaskWorkflowState(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(workflowState);
        return workflowEngineService;
    }

    private static Mock<IProcessEngineAuthorizer> CreateCompleteAuthorizerMock(
        string action,
        bool? completeProcessAuthorized = null,
        bool actionAuthorized = true
    )
    {
        var authorizer = new Mock<IProcessEngineAuthorizer>(MockBehavior.Strict);
        authorizer
            .Setup(service =>
                service.AuthorizeProcessNext(It.Is<Instance>(instance => instance.Id == _instanceId), action)
            )
            .ReturnsAsync(actionAuthorized);
        if (completeProcessAuthorized is bool authorized)
        {
            authorizer
                .Setup(service =>
                    service.AuthorizeProcessNext(It.Is<Instance>(instance => instance.Id == _instanceId), null)
                )
                .ReturnsAsync(authorized);
        }

        return authorizer;
    }

    private static void VerifyCompleteAuthorizations(
        Mock<IProcessEngineAuthorizer> authorizer,
        string action,
        bool completeAuthorizationExpected
    )
    {
        authorizer.Verify(
            service => service.AuthorizeProcessNext(It.Is<Instance>(instance => instance.Id == _instanceId), action),
            Times.Once
        );
        authorizer.Verify(
            service => service.AuthorizeProcessNext(It.Is<Instance>(instance => instance.Id == _instanceId), null),
            completeAuthorizationExpected ? Times.Once() : Times.Never()
        );
        authorizer.VerifyNoOtherCalls();
    }

    private static Mock<IValidationService> CreateValidationServiceMock(
        IReadOnlyCollection<ValidationIssueWithSource> validationIssues,
        Action? onValidation = null
    )
    {
        var validationService = new Mock<IValidationService>(MockBehavior.Strict);
        validationService
            .Setup(service =>
                service.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    "Task_1",
                    null,
                    null,
                    It.IsAny<string?>()
                )
            )
            .Callback(() => onValidation?.Invoke())
            .ReturnsAsync(validationIssues.ToList());
        return validationService;
    }

    private static void VerifyValidationCalls(Mock<IValidationService> validationService, Times times)
    {
        validationService.Verify(
            service =>
                service.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    "Task_1",
                    null,
                    null,
                    It.IsAny<string?>()
                ),
            times
        );
        validationService.VerifyNoOtherCalls();
    }

    private static Mock<IUserAction> CreateStrictCompleteActionMock(string actionId = "write")
    {
        var action = new Mock<IUserAction>(MockBehavior.Strict);
        action.SetupGet(userAction => userAction.Id).Returns(actionId);
        return action;
    }

    private void VerifyAppCodeWasNotInvoked(Mock<IUserAction> action)
    {
        _formDataValidatorMock.Verify(
            validator =>
                validator.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string?>()
                ),
            Times.Never
        );
        action.Verify(userAction => userAction.HandleAction(It.IsAny<UserActionContext>()), Times.Never);
        action.VerifyNoOtherCalls();
        _dataProcessorMock.VerifyNoOtherCalls();
    }

    private static Mock<IPdfGeneratorClient> SetupPdfGeneratorMock()
    {
        var pdfMock = new Mock<IPdfGeneratorClient>(MockBehavior.Strict);
        pdfMock
            .Setup(p =>
                p.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new MemoryStream());
        return pdfMock;
    }

    //TODO: replace this assertion with a proper one once fluentassertions has a json compare feature scheduled for v7 https://github.com/fluentassertions/fluentassertions/issues/2205
    private static void CompareResult<T>(string expectedString, string actualString)
    {
        T? expected = JsonSerializer.Deserialize<T>(expectedString);
        T? actual = JsonSerializer.Deserialize<T>(actualString);
        actual.Should().BeEquivalentTo(expected);
    }

    /// <summary>A real service task that records whether it ran — validation must stop before it does.</summary>
    private sealed class RecordingServiceTask(string type) : IServiceTask
    {
        public int ExecuteCount { get; private set; }

        public string Type => type;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context)
        {
            ExecuteCount++;
            return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
        }
    }
}
