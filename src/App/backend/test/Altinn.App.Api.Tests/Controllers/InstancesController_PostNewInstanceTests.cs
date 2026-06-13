using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.FileAnalysis;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_PostNewInstanceTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IDataProcessor> _dataProcessor = new();

    public InstancesController_PostNewInstanceTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessor.Object);
        };
    }

    [Fact]
    public async Task PostNewInstanceWithContent_FailsWhenDataTypeSpecifiesNotFirstTask()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(
            new ByteArrayContent([1, 2, 5]) { Headers = { ContentType = new MediaTypeHeaderValue("image/png") } },
            name: "task2DataType"
        );

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);
        Assert.Equal(HttpStatusCode.Conflict, createResponse.StatusCode);

        // This asserts on the current behaviour. Next version might use the `StartEvent` when posting a multipart instance creation
        Assert.Contains(
            "Data element of type task2DataType can only be modified in Task_2 (current task Task_1)",
            createResponseContent
        );
    }

    [Fact]
    public async Task PostNewInstanceWithContent_ValidFilename_Succeeds()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        string filename = "validfile.png";

        OverrideServicesForThisTest = services =>
        {
            services.AddTransient<IFileAnalyser, FilenameAnalyserStub>();
            services.AddTransient<IFileValidator, FilenameValidatorStub>();
        };

        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data with valid filename
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent([1, 2, 5]);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        fileContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "\"specificFileType\"",
            FileName = $"\"{filename}\"",
        };
        content.Add(fileContent);

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        var createResponseParsed = JsonSerializer.Deserialize<Instance>(createResponseContent, JsonSerializerOptions)!;
        var instanceId = createResponseParsed.Id;

        // Verify the file data element was created - filename validation passed
        var dataElement = Assert.Single(createResponseParsed.Data, d => d.DataType == "specificFileType");
        Assert.Equal("image/png", dataElement.ContentType);

        TestData.DeleteInstanceAndData(org, app, instanceId);
    }

    [Fact]
    public async Task PostNewInstanceWithContent_InvalidFilename_Fails()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        string filename = "malicious.exe";

        OverrideServicesForThisTest = services =>
        {
            services.AddTransient<IFileAnalyser, FilenameAnalyserStub>();
            services.AddTransient<IFileValidator, FilenameValidatorStub>();
        };

        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data with filename that has disallowed extension
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent([1, 2, 5]);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        fileContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
        {
            Name = "\"specificFileType\"",
            FileName = $"\"{filename}\"",
        };
        content.Add(fileContent);

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);

        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
        Assert.Contains("Invalid filename", createResponseContent);
    }

    [Fact]
    public async Task PostNewInstanceWithContent_EnsureDataIsPresent()
    {
        // Setup test data
        string testName = nameof(PostNewInstanceWithContent_EnsureDataIsPresent);
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(
            new StringContent(
                $$$"""<Skjema><melding><name>{{{testName}}}</name></melding></Skjema>""",
                Encoding.UTF8,
                "application/xml"
            ),
            "default"
        );
        content.Add(
            new ByteArrayContent([1, 2, 4]) { Headers = { ContentType = new MediaTypeHeaderValue("application/pdf") } },
            name: "9edd53de-f46f-40a1-bb4d-3efb93dc113d"
        );
        content.Add(
            new ByteArrayContent([1, 2, 5]) { Headers = { ContentType = new MediaTypeHeaderValue("image/png") } },
            name: "specificFileType"
        );

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var createResponseParsed = JsonSerializer.Deserialize<Instance>(createResponseContent, JsonSerializerOptions)!;

        // Verify Data id
        Assert.Equal(3, createResponseParsed.Data.Count);

        // Verify stored data
        var instanceId = createResponseParsed.Id;
        var dataGuid = createResponseParsed.Data.Single(x => x.DataType == "default").Id;
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        Assert.Equal(HttpStatusCode.OK, readDataElementResponse.StatusCode);
        var readDataElementResponseContent = await readDataElementResponse.Content.ReadAsStringAsync();
        var readDataElementResponseParsed = JsonSerializer.Deserialize<Skjema>(readDataElementResponseContent)!;
        Assert.Equal(testName, readDataElementResponseParsed.Melding!.Name);

        // Verify specific file types
        var specificFileType = createResponseParsed.Data.Single(d => d.DataType == "specificFileType");
        Assert.Equal("image/png", specificFileType.ContentType);
        var pdfContent = await client.GetByteArrayAsync(
            $"/{org}/{app}/instances/{instanceId}/data/{specificFileType.Id}"
        );
        Assert.Equal(new byte[] { 1, 2, 5 }, pdfContent);

        var pdfElement = createResponseParsed.Data.Single(d => d.ContentType == "application/pdf");
        Assert.Equal("9edd53de-f46f-40a1-bb4d-3efb93dc113d", pdfElement.DataType);
        var pngContent = await client.GetByteArrayAsync($"/{org}/{app}/instances/{instanceId}/data/{pdfElement.Id}");
        Assert.Equal(new byte[] { 1, 2, 4 }, pngContent);

        TestData.DeleteInstanceAndData(org, app, instanceId);
    }

    [Fact]
    public async Task PostNewInstance_WithEmailUser_ShouldCreateInstanceAndNotFail()
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        using HttpClient client = GetRootedOrgClient(org, app);

        // Create instance data
        var body = $$"""
                {
                    "instanceOwner": {
                        "username": "post@altinn.no"
                    }
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        using var response = await client.PostAsync($"{org}/{app}/instances", content);

        var responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var instance = JsonSerializer.Deserialize<Instance>(responseContent, JsonSerializerOptions);
        Assert.NotNull(instance);
        Assert.Equal("epost:post@altinn.no", instance.InstanceOwner.Username);
    }

    [Theory]
    [ClassData(typeof(TestAuthentication.AllTokens))]
    public async Task PostNewInstance_Simplified(TestJwtToken token)
    {
        // Setup test data
        string org = "tdd";
        string app = "permissive-app";
        int instanceOwnerPartyId = token.PartyId;

        OverrideServicesForThisTest = services =>
        {
            services.AddTelemetrySink(
                additionalActivitySources: source => source.Name == "Microsoft.AspNetCore",
                additionalMeters: source => source.Name == "Microsoft.AspNetCore.Hosting",
                filterMetrics: metric => metric.Name == "http.server.request.duration"
            );
        };

        using HttpClient client = GetRootedClient(org, app, includeTraceContext: true);

        var (createResponseParsed, _) = await InstancesControllerFixture.CreateInstanceSimplified(
            org,
            app,
            instanceOwnerPartyId,
            client,
            token.Token
        );
        var instanceId = createResponseParsed.Id;
        Assert.Single(createResponseParsed.Data);

        // Verify stored data
        var dataGuid = createResponseParsed.Data.First().Id;
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        Assert.Equal(HttpStatusCode.OK, readDataElementResponse.StatusCode);
        var readDataElementResponseContent = await readDataElementResponse.Content.ReadAsStringAsync();
        var readDataElementResponseParsed = JsonSerializer.Deserialize<Skjema>(readDataElementResponseContent)!;
        Assert.Null(readDataElementResponseParsed.Melding);
        TestData.DeleteInstanceAndData(org, app, instanceId);

        await Verify(await GetTelemetrySnapshot(numberOfActivities: 2, numberOfMetrics: 2))
            .ScrubInstance<KeyValuePair<string, object?>>(kvp => kvp.Key == "url.path")
            .UseTextForParameters(token.Type.ToString());
    }

    [Fact]
    public async Task PostNewInstance_Simplified_With_Prefill()
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);

        var prefill = new Dictionary<string, string> { { "melding.name", "TestName" } };
        var (createResponseParsed, _) = await InstancesControllerFixture.CreateInstanceSimplified(
            org,
            app,
            instanceOwnerPartyId,
            client,
            token,
            prefill
        );
        var instanceId = createResponseParsed.Id;
        Assert.Single(createResponseParsed.Data);
        var dataGuid = createResponseParsed.Data.First().Id;

        // Verify stored data
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        Assert.Equal(HttpStatusCode.OK, readDataElementResponse.StatusCode);
        var readDataElementResponseContent = await readDataElementResponse.Content.ReadAsStringAsync();
        var readDataElementResponseParsed = JsonSerializer.Deserialize<Skjema>(readDataElementResponseContent)!;
        Assert.NotNull(readDataElementResponseParsed.Melding);
        Assert.Equal("TestName", readDataElementResponseParsed.Melding.Name);
        TestData.DeleteInstanceAndData(org, app, instanceId);
    }

    [Fact]
    public async Task PostNewInstance_Simplified_DeletesCreatedInstanceWhenWorkflowIsNotAccepted()
    {
        string org = "tdd";
        string app = "permissive-app";
        int instanceOwnerPartyId = 501337;
        using HttpClient client = GetRootedClient(
            org,
            app,
            configureServices: services =>
            {
                services.RemoveAll<IWorkflowEngineClient>();
                services.AddSingleton<IWorkflowEngineClient>(
                    new RejectingWorkflowEngineClient(HttpStatusCode.TooManyRequests)
                );
            }
        );
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        var body = $$"""
                {
                    "instanceOwner": {
                        "partyId": "{{instanceOwnerPartyId}}"
                    }
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        using HttpResponseMessage createResponse = await client.PostAsync($"{org}/{app}/instances/create", content);
        string createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);

        createResponse.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        using JsonDocument document = JsonDocument.Parse(createResponseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("status").GetInt32().Should().Be(StatusCodes.Status500InternalServerError);
        root.GetProperty("title").GetString().Should().Be("Instance initialization failed.");
        root.GetProperty("detail")
            .GetString()
            .Should()
            .Contain("The created instance was deleted, so the client can safely retry instance creation.");
        root.GetProperty("technicalDetail")
            .GetString()
            .Should()
            .Contain(
                $"Initial process workflow submission failed for appId {org}/{app} for party {instanceOwnerPartyId}"
            );
        root.GetProperty("initializationState").GetString().Should().Be("workflowNotAccepted");
        root.GetProperty("instanceDeleted").GetBoolean().Should().BeTrue();
        root.GetProperty("recommendedAction").GetString().Should().Be("retryInstanceCreation");
        root.GetProperty("workflowSubmissionFailureKind")
            .GetString()
            .Should()
            .Be(WorkflowSubmissionFailureKind.NotAccepted.ToString());
        root.GetProperty("workflowSubmissionStatusCode").GetInt32().Should().Be(StatusCodes.Status429TooManyRequests);
        root.GetProperty("workflowCollectionKey").GetString().Should().NotBeNullOrWhiteSpace();

        string instanceId = root.GetProperty("instanceId").GetString()!;
        string[] instanceIdParts = instanceId.Split('/');
        Guid instanceGuid = Guid.Parse(instanceIdParts[1]);
        Instance storedInstance = await TestData.GetInstance(org, app, instanceOwnerPartyId, instanceGuid);
        storedInstance.Status?.IsHardDeleted.Should().BeTrue();

        TestData.DeleteInstanceAndData(org, app, instanceId);
    }

    [Fact]
    public async Task PostNewInstance_Simplified_KeepsCreatedInstanceWhenAcceptedWorkflowFails()
    {
        string org = "tdd";
        string app = "permissive-app";
        int instanceOwnerPartyId = 501337;
        using HttpClient client = GetRootedClient(
            org,
            app,
            configureServices: services =>
            {
                services.RemoveAll<IWorkflowEngineClient>();
                services.AddSingleton<IWorkflowEngineClient>(new AcceptedFailingWorkflowEngineClient());
            }
        );
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        var body = $$"""
                {
                    "instanceOwner": {
                        "partyId": "{{instanceOwnerPartyId}}"
                    }
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        using HttpResponseMessage createResponse = await client.PostAsync($"{org}/{app}/instances/create", content);
        string createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);

        createResponse.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        using JsonDocument document = JsonDocument.Parse(createResponseContent);
        JsonElement root = document.RootElement;
        root.GetProperty("status").GetInt32().Should().Be(StatusCodes.Status500InternalServerError);
        root.GetProperty("title").GetString().Should().Be("Instance initialization failed.");
        root.GetProperty("detail")
            .GetString()
            .Should()
            .Contain("Do not create a duplicate instance; resolve the workflow failure and call the resume endpoint.");
        root.GetProperty("technicalDetail")
            .GetString()
            .Should()
            .Contain(
                $"Initial process workflow execution failed for appId {org}/{app} for party {instanceOwnerPartyId}"
            );
        root.GetProperty("initializationState").GetString().Should().Be("workflowFailed");
        root.GetProperty("workflowAccepted").GetBoolean().Should().BeTrue();
        root.GetProperty("recommendedAction").GetString().Should().Be("resumeCurrentTask");
        JsonElement resumeEndpoint = root.GetProperty("resumeEndpoint");
        resumeEndpoint.GetProperty("method").GetString().Should().Be("POST");
        JsonElement workflowFailure = root.GetProperty("workflowFailure");
        workflowFailure.GetProperty("kind").GetString().Should().Be(WorkflowFailureKind.StepFailed.ToString());
        workflowFailure.GetProperty("stepOperationId").GetString().Should().Be("StartTask");
        workflowFailure
            .GetProperty("lastError")
            .GetProperty("message")
            .GetString()
            .Should()
            .Be("Simulated workflow callback failure.");

        string instanceId = root.GetProperty("instanceId").GetString()!;
        string[] instanceIdParts = instanceId.Split('/');
        Guid instanceGuid = Guid.Parse(instanceIdParts[1]);
        resumeEndpoint
            .GetProperty("path")
            .GetString()
            .Should()
            .Be($"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/resume");
        Instance storedInstance = await TestData.GetInstance(org, app, instanceOwnerPartyId, instanceGuid);
        storedInstance.Status?.IsHardDeleted.Should().NotBe(true);

        TestData.DeleteInstanceAndData(org, app, instanceId);
    }

    [Theory]
    [InlineData(
        "INVALID XML",
        "There is an error in XML document (1, 1). Data at the root level is invalid. Line 1, position 1."
    )]
    [InlineData(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?><Skjema><melding><name>Test</name></melding>",
        "There is an error in XML document (1, 83). Unexpected end of file has occurred. The following elements are not closed: Skjema. Line 1, position 83."
    )]
    [InlineData(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?><WrongRoot><melding><name>Test</name></melding></WrongRoot>",
        "There is an error in XML document (1, 40). <WrongRoot xmlns=''> was not expected."
    )] // Wrong root element
    [InlineData(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?><Skjema xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\"><melding><name>Per Olsen</name><random>afdetsd</random><tags>ddd</tags><toggle>invalid boolean</toggle></melding></Skjema>",
        "There is an error in XML document (1, 251). The string 'invalid boolean' is not a valid Boolean value."
    )] // Invalid value for boolean
    public async Task PostNewInstanceWithInvalidData_EnsureInvalidResponse(
        string invalidXml,
        string expectedDescription
    )
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;

        OverrideServicesForThisTest = services =>
        {
            services.AddTelemetrySink(additionalActivitySources: source => source.Name == "Microsoft.AspNetCore");
        };
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent(invalidXml, System.Text.Encoding.UTF8, "application/xml"), "default");

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);

        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
        Assert.Contains("Failed to deserialize XML", createResponseContent);
        var responseObject = System.Text.Json.JsonSerializer.Deserialize<ProblemDetails>(createResponseContent);
        Assert.Equal("Failed to deserialize XML", responseObject?.Title);
        Assert.Equal(expectedDescription, responseObject?.Detail);
        Assert.Equal(StatusCodes.Status400BadRequest, responseObject?.Status);

        var telemetrySnapshot = await GetTelemetrySnapshot(numberOfActivities: 1, numberOfMetrics: 0);

        var activity = Assert.Single(
            telemetrySnapshot.Activities!,
            a => a.Name == "SerializationService.DeserializeXml"
        );
        var activityEvent = Assert.Single(activity.Events, e => e.Name == "exception");
        var tag = Assert.Single(activityEvent.Tags, t => t.Key == "exception.type");
        Assert.Equal("System.InvalidOperationException", tag.Value);
    }

    [Fact]
    public async Task PostNewInstanceWithWrongPartname_EnsureBadRequest()
    {
        // Setup test data
        string testName = nameof(PostNewInstanceWithWrongPartname_EnsureBadRequest);
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(
            new StringContent(
                $$$"""<Skjema><melding><name>{{{testName}}}</name></melding></Skjema>""",
                System.Text.Encoding.UTF8,
                "application/xml"
            ),
            "wrongName"
        );

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);
        Assert.Contains(
            "Multipart section named, 'wrongName' does not correspond to an element",
            createResponseContent
        );
    }

    [Fact]
    public async Task InstationAllowedByOrg_Returns_Forbidden_For_user()
    {
        // Setup test data
        string testName = nameof(InstationAllowedByOrg_Returns_Forbidden_For_user);
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        OverrideServicesForThisTest = services =>
            services.AddSingleton(new AppMetadataMutationHook(app => app.DisallowUserInstantiation = true));
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(
            new StringContent(
                $$$"""<Skjema><melding><name>{{{testName}}}</name></melding></Skjema>""",
                System.Text.Encoding.UTF8,
                "application/xml"
            ),
            "default"
        );

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);
    }

    [Fact]
    public async Task PostNewInstanceWithInstanceTemplate()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        int userId = 1337;
        using HttpClient client = GetRootedUserClient(org, app, userId, instanceOwnerPartyId);

        using var content = JsonContent.Create(
            new Instance() { InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyId.ToString() } }
        );

        var response = await client.PostAsync($"{org}/{app}/instances", content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        var instance = JsonSerializer.Deserialize<Instance>(responseContent, JsonSerializerOptions);
        Assert.NotNull(instance);
        Assert.NotNull(instance.Id);
        Assert.NotEmpty(instance.Id);

        TestData.DeleteInstanceAndData(org, app, instance.Id);
    }

    [Fact]
    public async Task PostNewInstanceWithInstanceTemplateString()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        // Get an org token
        // (to avoid issues with read status being set when initialized by normal users)
        using HttpClient client = GetRootedOrgClient(org, app, serviceOwnerOrg: org);

        using var content = new StringContent(
            $$"""
            {
                "instanceOwner": {
                    "partyId": {{instanceOwnerPartyId}}
                },
                "status": {
                    "readStatus": "UpdatedSinceLastReview",
                    "substatus": {
                        "label": "min label",
                        "description": "min beskrivelse"
                    }
                }
            }
            """,
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.PostAsync($"{org}/{app}/instances", content);
        var responseContent = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseContent);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var instance = JsonSerializer.Deserialize<Instance>(responseContent, JsonSerializerOptions)!;
        Assert.NotNull(instance);
        Assert.NotEmpty(instance.Id);
        Assert.NotNull(instance.Status);
        Assert.Equal(ReadStatus.UpdatedSinceLastReview, instance.Status.ReadStatus);
        Assert.NotNull(instance.Status.Substatus);
        Assert.Equal("min label", instance.Status.Substatus!.Label);
        Assert.Equal("min beskrivelse", instance.Status.Substatus!.Description);

        TestData.DeleteInstanceAndData(org, app, instance.Id);
    }

    [Fact]
    public async Task PostNewInstanceWithMissingTemplate()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        int userId = 1337;
        using HttpClient client = GetRootedUserClient(org, app, userId, instanceOwnerPartyId);

        using var content = new ByteArrayContent([])
        {
            Headers = { ContentType = new MediaTypeHeaderValue("application/json") },
        };

        var response = await client.PostAsync(
            $"{org}/{app}/instances?instanceOwnerPartyId={instanceOwnerPartyId}",
            content
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var responseContent = await response.Content.ReadAsStringAsync();
        var instance = JsonSerializer.Deserialize<Instance>(responseContent, JsonSerializerOptions);
        Assert.NotNull(instance);
        Assert.NotNull(instance.Id);
        Assert.NotEmpty(instance.Id);

        TestData.DeleteInstanceAndData(org, app, instance.Id);
    }

    [Fact]
    public async Task InstationAllowedByOrg_Returns_Forbidden_For_User_SimplifiedEndpoint()
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        OverrideServicesForThisTest = services =>
            services.AddSingleton(new AppMetadataMutationHook(app => app.DisallowUserInstantiation = true));
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(userId: 1337, partyId: instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance data
        var body = $$"""
                {
                    "prefill": {},
                    "instanceOwner": {
                        "partyId": "{{instanceOwnerPartyId}}"
                    }
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        // Create instance
        var createResponse = await client.PostAsync($"{org}/{app}/instances/create", content);
        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);
    }

    [Fact]
    public async Task InstantiationAllowedByOrg_Returns_Ok_For_User_When_Copying_SimplifiedEndpoint()
    {
        var pdfMock = new Mock<IPdfGeneratorClient>(MockBehavior.Strict);
        using var pdfReturnStream = new MemoryStream();
        pdfMock
            .Setup(p =>
                p.GeneratePdf(
                    It.IsAny<Uri>(),
                    It.IsAny<string?>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(pdfReturnStream);

        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        OverrideServicesForThisTest = services =>
        {
            services.AddSingleton(pdfMock.Object);
            services.AddSingleton(new AppMetadataMutationHook(app => app.DisallowUserInstantiation = true));
        };
        HttpClient client = GetRootedClient(org, app);

        string orgToken = TestAuthentication.GetServiceOwnerToken("405003309", org: "tdd");
        string userToken = TestAuthentication.GetUserToken(1337, 501337);

        var (sourceInstance, _) = await InstancesControllerFixture.CreateInstanceSimplified(
            org,
            app,
            instanceOwnerPartyId,
            client,
            orgToken
        );
        Assert.Single(sourceInstance.Data);
        var dataGuid = sourceInstance.Data.First().Id;
        var patch = new JsonPatch(
            PatchOperation.Replace(JsonPointer.Create("melding"), JsonNode.Parse("{\"name\": \"Ola Olsen\"}"))
        );
        await UpdateInstanceData(org, app, client, userToken, sourceInstance.Id, dataGuid, patch);
        await CompleteInstance(org, app, client, userToken, sourceInstance.Id);

        // Verify Data id
        var sourceInstanceId = sourceInstance.Id;

        // Copy instance
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            userToken
        );

        // Create instance data
        var body = $$"""
                {
                    "prefill": {},
                    "instanceOwner": {
                        "partyId": "{{instanceOwnerPartyId}}"
                    },
                    "sourceInstanceId": "{{sourceInstanceId}}"
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        // Create copy instance
        var createResponse = await client.PostAsync($"{org}/{app}/instances/create", content);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        TestData.DeleteInstanceAndData(org, app, sourceInstance.Id);

        var createResponseParsed = JsonSerializer.Deserialize<Instance>(createResponseContent, JsonSerializerOptions);
        if (createResponseParsed is not null)
        {
            TestData.DeleteInstanceAndData(org, app, createResponseParsed.Id);
        }
    }

    [Fact]
    public async Task CopyInstance_CopyInstanceValidator_Returns_Forbidden_When_Validation_Fails()
    {
        var pdfMock = new Mock<IPdfGeneratorClient>(MockBehavior.Strict);
        using var pdfReturnStream = new MemoryStream();
        pdfMock
            .Setup(p => p.GeneratePdf(It.IsAny<Uri>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(pdfReturnStream);

        var copyInstanceValidatorMock = new Mock<ICopyInstanceValidator>();
        copyInstanceValidatorMock
            .Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>()))
            .ReturnsAsync(
                new InstantiationValidationResult
                {
                    Valid = false,
                    Message = "Copy validation failed for test purposes",
                }
            );

        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        OverrideServicesForThisTest = services =>
        {
            services.AddSingleton(pdfMock.Object);
            services.AddSingleton(copyInstanceValidatorMock.Object);
        };
        HttpClient client = GetRootedClient(org, app);

        string orgToken = TestAuthentication.GetServiceOwnerToken("405003309", org: "tdd");
        string userToken = TestAuthentication.GetUserToken(1337, 501337);

        // Create source instance
        var (sourceInstance, _) = await InstancesControllerFixture.CreateInstanceSimplified(
            org,
            app,
            instanceOwnerPartyId,
            client,
            orgToken
        );
        Assert.Single(sourceInstance.Data);
        var dataGuid = sourceInstance.Data.First().Id;
        var patch = new JsonPatch(
            PatchOperation.Replace(JsonPointer.Create("melding"), JsonNode.Parse("{\"name\": \"Ola Olsen\"}"))
        );
        await UpdateInstanceData(org, app, client, userToken, sourceInstance.Id, dataGuid, patch);
        await CompleteInstance(org, app, client, userToken, sourceInstance.Id);

        var sourceInstanceId = sourceInstance.Id;

        // Attempt to copy instance with validation error
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            userToken
        );

        var body = $$"""
                {
                    "prefill": {},
                    "instanceOwner": {
                        "partyId": "{{instanceOwnerPartyId}}"
                    },
                    "sourceInstanceId": "{{sourceInstanceId}}"
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        // Create copy instance - should fail
        var createResponse = await client.PostAsync($"{org}/{app}/instances/create", content);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createResponseContent);

        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);
        Assert.Contains("Copy validation failed for test purposes", createResponseContent);

        // Verify the validator was called
        copyInstanceValidatorMock.Verify(v => v.Validate(It.IsAny<IInstanceDataAccessor>()), Times.Once);

        TestData.DeleteInstanceAndData(org, app, sourceInstance.Id);
    }

    private async Task UpdateInstanceData(
        string org,
        string app,
        HttpClient client,
        string token,
        string instanceId,
        string dataGuid,
        JsonPatch patch
    )
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        var serializedPatch = JsonSerializer.Serialize(
            new DataPatchRequest() { Patch = patch, IgnoredValidators = [] },
            JsonSerializerOptions
        );
        OutputHelper.WriteLine(serializedPatch);
        using var updateDataElementContent = new StringContent(serializedPatch, Encoding.UTF8, "application/json");
        using var response = await client.PatchAsync(
            $"/{org}/{app}/instances/{instanceId}/data/{dataGuid}",
            updateDataElementContent
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private async Task CompleteInstance(string org, string app, HttpClient client, string token, string instanceId)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        using var nextResponse = await client.PutAsync($"{org}/{app}/instances/{instanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        Assert.Equal(HttpStatusCode.OK, nextResponse.StatusCode);
    }

    private sealed class RejectingWorkflowEngineClient(HttpStatusCode statusCode) : IWorkflowEngineClient
    {
        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken ct = default
        ) => throw new HttpRequestException("Workflow engine rejected enqueue.", null, statusCode);

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken ct = default
        ) => Task.FromResult<WorkflowCollectionDetailResponse?>(null);

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken ct = default
        ) => Task.FromResult<IReadOnlyList<WorkflowStatusResponse>>([]);

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken ct = default
        ) => throw new NotSupportedException();
    }

    private sealed class AcceptedFailingWorkflowEngineClient : IWorkflowEngineClient
    {
        private readonly Guid _workflowId = Guid.NewGuid();
        private string? _collectionKey;

        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken ct = default
        )
        {
            _collectionKey = collectionKey;
            return Task.FromResult(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = _workflowId, Namespace = ns }],
                }
            );
        }

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken ct = default
        ) =>
            Task.FromResult<WorkflowCollectionDetailResponse?>(
                new WorkflowCollectionDetailResponse
                {
                    Key = key,
                    Namespace = ns,
                    Heads =
                    [
                        new CollectionHeadStatus { DatabaseId = _workflowId, Status = PersistentItemStatus.Failed },
                    ],
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                }
            );

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken ct = default
        ) =>
            Task.FromResult<IReadOnlyList<WorkflowStatusResponse>>([
                new WorkflowStatusResponse
                {
                    DatabaseId = _workflowId,
                    OperationId = "Process next: StartEvent_1 -> Task_1",
                    IdempotencyKey = "accepted-failing-workflow",
                    Namespace = ns,
                    CollectionKey = collectionKey ?? _collectionKey,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                    OverallStatus = PersistentItemStatus.Failed,
                    Steps =
                    [
                        new StepStatusResponse
                        {
                            DatabaseId = Guid.NewGuid(),
                            OperationId = "StartTask",
                            ProcessingOrder = 0,
                            Command = new StepStatusResponse.CommandDetails { Type = "app" },
                            Status = PersistentItemStatus.Failed,
                            RetryCount = 0,
                            ErrorHistory =
                            [
                                new ErrorEntry(
                                    DateTimeOffset.UtcNow,
                                    "Simulated workflow callback failure.",
                                    StatusCodes.Status500InternalServerError,
                                    WasRetryable: true
                                ),
                            ],
                        },
                    ],
                },
            ]);

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken ct = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken ct = default
        ) => throw new NotSupportedException();
    }
}

public class FilenameAnalyserStub : IFileAnalyser
{
    public string Id { get; private set; } = "mimeTypeAnalyser";

    public Task<FileAnalysisResult> Analyse(Stream stream, string? filename = null)
    {
        return Task.FromResult(
            new FileAnalysisResult(Id)
            {
                MimeType = "image/png",
                Filename = filename,
                Extensions = new List<string>() { "png" },
            }
        );
    }
}

public class FilenameValidatorStub : IFileValidator
{
    public string Id { get; private set; } = "mimeTypeValidator";

    public Task<(bool Success, IEnumerable<ValidationIssue> Errors)> Validate(
        DataType dataType,
        IEnumerable<FileAnalysisResult> fileAnalysisResults
    )
    {
        List<ValidationIssue> errors = new();

        var fileAnalysisResult = fileAnalysisResults.FirstOrDefault();
        var filename = fileAnalysisResult?.Filename;

        if (string.IsNullOrEmpty(filename))
        {
            return Task.FromResult((true, (IEnumerable<ValidationIssue>)errors));
        }

        // Check for disallowed file extensions (simulating filename validation)
        string[] disallowedExtensions = [".exe", ".bat", ".sh", ".cmd", ".ps1"];
        string extension = Path.GetExtension(filename).ToLowerInvariant();

        if (disallowedExtensions.Contains(extension))
        {
            ValidationIssue error = new()
            {
                Source = ValidationIssueSources.File,
                Code = ValidationIssueCodes.DataElementCodes.InvalidFileNameFormat,
                Severity = ValidationIssueSeverity.Error,
                Description = $"Invalid filename: '{filename}' has a disallowed extension '{extension}'.",
            };

            errors.Add(error);
            return Task.FromResult((false, (IEnumerable<ValidationIssue>)errors));
        }

        return Task.FromResult((true, (IEnumerable<ValidationIssue>)errors));
    }
}
