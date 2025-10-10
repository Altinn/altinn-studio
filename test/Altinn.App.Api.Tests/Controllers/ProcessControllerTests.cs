using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Newtonsoft.Json;
using Xunit.Abstractions;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.App.Api.Tests.Controllers;

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
    public async Task RunProcessNext_PdfFails_DataIsUnlocked()
    {
        this.OverrideServicesForThisTest = (services) =>
        {
            services.AddTelemetrySink(
                additionalActivitySources: source => source.Name == "Microsoft.AspNetCore",
                additionalMeters: source => source.Name == "Microsoft.AspNetCore.Hosting",
                filterMetrics: metric => metric.Name == "http.server.request.duration"
            );
        };

        bool sendAsyncCalled = false;
        var dataElementPath = TestData.GetDataElementPath(Org, App, InstanceOwnerPartyId, _instanceGuid, _dataGuid);

        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");
            var content = await message.Content!.ReadAsStringAsync();

            OutputHelper.WriteLine("pdf request content:");
            OutputHelper.WriteLine(content);
            OutputHelper.WriteLine("");

            // Verify that data element is locked while pdf is being generated
            var lockedInstanceString = await File.ReadAllTextAsync(dataElementPath);
            var lockedInstance = JsonSerializer.Deserialize<DataElement>(lockedInstanceString, JsonSerializerOptions)!;
            lockedInstance.Locked.Should().BeTrue();

            sendAsyncCalled = true;

            // Return a 429 to simulate pdf generation failure
            return new HttpResponseMessage(HttpStatusCode.TooManyRequests);
        };
        using var client = GetRootedUserClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{_instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.InternalServerError);
        sendAsyncCalled.Should().BeTrue();

        var telemetry = this.Services.GetRequiredService<TelemetrySink>();

        // Verify that the instance is not locked after pdf failed
        var unLockedInstanceString = await File.ReadAllTextAsync(dataElementPath);
        var unLockedInstance = JsonSerializer.Deserialize<DataElement>(unLockedInstanceString, JsonSerializerOptions)!;
        unLockedInstance.Locked.Should().BeFalse();

        await telemetry.WaitForServerTelemetry();
        await Verify(telemetry.GetSnapshot());
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

        var telemetry = this.Services.GetRequiredService<TelemetrySink>();

        // Verify that the instance is not updated
        var instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.Should().NotBeNull();
        instance.Process.CurrentTask!.ElementId.Should().Be("Task_1");

        await telemetry.WaitForServerTelemetry();
        await Verify(telemetry.GetSnapshot());
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
            var instance = await instanceClient.GetInstance(App, Org, InstanceOwnerPartyId, _instanceGuid);
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

    private static Mock<IPdfGeneratorClient> SetupPdfGeneratorMock()
    {
        var pdfMock = new Mock<IPdfGeneratorClient>(MockBehavior.Strict);
        pdfMock
            .Setup(p => p.GeneratePdf(It.IsAny<Uri>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
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
}
