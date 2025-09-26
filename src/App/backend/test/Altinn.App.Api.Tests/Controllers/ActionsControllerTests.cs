using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.task_action.config.models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class ActionsControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions(
        JsonSerializerDefaults.Web
    );
    private readonly ITestOutputHelper _outputHelper;

    public ActionsControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        _outputHelper = outputHelper;
    }

    [Fact]
    public async Task Perform_returns_403_if_user_not_authorized()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(1000, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent(
            "{\"action\":\"lookup_unauthorized\"}",
            Encoding.UTF8,
            "application/json"
        );
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // Verify that [ResponseCache] attribute is being set by filter
        Assert.NotNull(response.Headers.CacheControl);
        Assert.Equal("no-store, no-cache", response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task Perform_returns_401_if_user_not_authenticated()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        using var content = new StringContent(
            "{\"action\":\"lookup_unauthorized\"}",
            Encoding.UTF8,
            "application/json"
        );
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Perform_returns_401_if_userId_is_null()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        using var content = new StringContent(
            "{\"action\":\"lookup_unauthorized\"}",
            Encoding.UTF8,
            "application/json"
        );
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Perform_returns_400_if_action_is_null()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(1000, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":null}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Perform_returns_409_if_process_not_started()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef43");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Perform_returns_409_if_process_ended()
    {
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef42");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(1000, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Perform_returns_200_if_action_succeeded()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, LookupAction>();
        };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(1000, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var requestContent = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            requestContent
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var expectedString = """
            {
              "instance": {},
              "updatedDataModels": {},
              "updatedValidationIssues": {},
              "clientActions": [
                {
                  "id": "nextPage",
                  "metadata": null
                }
              ],
              "error": null
            }
            """;
        CompareResult<UserActionResponse>(
            expectedString,
            content,
            mutator: actionResponse =>
            {
                // Don't compare the instance object
                if (actionResponse != null)
                {
                    actionResponse.Instance = new();
                }
            }
        );
    }

    [Fact]
    public async Task Perform_returns_400_if_action_failed_and_errorType_is_BadRequest()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, LookupAction>();
        };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(400, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Perform_returns_401_if_action_failed_and_errorType_is_Unauthorized()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, LookupAction>();
        };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(userId: 401, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Perform_returns_409_if_action_failed_and_errorType_is_Conflict()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, LookupAction>();
        };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(userId: 409, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Perform_returns_500_if_action_failed_and_errorType_is_Internal()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, LookupAction>();
        };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(userId: 500, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"lookup\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Perform_returns_404_if_action_implementation_not_found()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, LookupAction>();
        };
        var org = "tdd";
        var app = "task-action";
        HttpClient client = GetRootedClient(org, app);
        Guid guid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        TestData.PrepareInstance(org, app, 1337, guid);
        string token = TestAuthentication.GetUserToken(userId: 1001, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
        using var content = new StringContent("{\"action\":\"notfound\"}", Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await client.PostAsync(
            $"/{org}/{app}/instances/1337/{guid}/actions",
            content
        );
        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, guid);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PerformFillActionThatMutatesData()
    {
        var org = "tdd";
        var app = "task-action";
        Guid instanceGuid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        int instanceOwner = 1337;
        TestData.PrepareInstance(org, app, 1337, instanceGuid);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, FillAction>();
        };
        var client = GetRootedUserClient(org, app, 1337);
        string token = TestAuthentication.GetUserToken(userId: 1001, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Run buttonId "add"
        using var content = JsonContent.Create(new { action = "fill", buttonId = "add" });
        using HttpResponseMessage addResponse = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwner}/{instanceGuid}/actions",
            content
        );

        var parsedAddResponse = await VerifyStatusAndDeserialize<UserActionResponse>(addResponse, HttpStatusCode.OK);
        parsedAddResponse.ClientActions.Should().BeEmpty();
        parsedAddResponse.Instance.Should().NotBeNull();
        parsedAddResponse.Instance.Id.Should().Be($"{instanceOwner}/{instanceGuid}");
        var dataElement = parsedAddResponse.Instance.Data.Should().ContainSingle().Which;

        var schemeElement = parsedAddResponse
            .UpdatedDataModels.Should()
            .HaveCount(1)
            .And.ContainKey(dataElement.Id)
            .WhoseValue.Should()
            .BeOfType<JsonElement>()
            .Which;
        var scheme =
            schemeElement.Deserialize<Scheme>(_jsonSerializerOptions)
            ?? throw new Exception("Failed to deserialize Scheme");
        scheme.TestCustomButtonInput.Should().Be("Hello a");

        // Run buttonId "update"
        using var updateContent = JsonContent.Create(new { action = "fill", buttonId = "update" });
        using HttpResponseMessage updateResponse = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwner}/{instanceGuid}/actions",
            updateContent
        );
        var parsedUpdateResponse = await VerifyStatusAndDeserialize<UserActionResponse>(
            updateResponse,
            HttpStatusCode.OK
        );
        parsedUpdateResponse.ClientActions.Should().BeEmpty();
        parsedUpdateResponse.Instance.Should().NotBeNull();
        parsedUpdateResponse.Instance.Id.Should().Be($"{instanceOwner}/{instanceGuid}");
        var updatedDataElement = parsedUpdateResponse.Instance.Data.Should().ContainSingle().Which;
        var updatedSchemeElement = parsedUpdateResponse
            .UpdatedDataModels.Should()
            .HaveCount(1)
            .And.ContainKey(updatedDataElement.Id)
            .WhoseValue.Should()
            .BeOfType<JsonElement>()
            .Which;
        var updatedScheme =
            updatedSchemeElement.Deserialize<Scheme>(_jsonSerializerOptions)
            ?? throw new Exception("Failed to deserialize Scheme");
        updatedScheme.TestCustomButtonInput.Should().Be("Hello a");
        updatedScheme.TestCustomButtonReadOnlyInput.Should().Be("Her kommer det data fra backend");

        TestData
            .GetDataElementBlobContnet(org, app, instanceOwner, instanceGuid, Guid.Parse(updatedDataElement.Id))
            .Should()
            .Contain("Her kommer det data fra backend");

        // Run buttonId "updateObsolete"
        using var updateObsoleteContent = JsonContent.Create(new { action = "fill", buttonId = "updateObsolete" });
        using HttpResponseMessage updateObsoleteResponse = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwner}/{instanceGuid}/actions",
            updateObsoleteContent
        );
        var parsedUpdateObsoleteResponse = await VerifyStatusAndDeserialize<UserActionResponse>(
            updateObsoleteResponse,
            HttpStatusCode.OK
        );
        parsedUpdateObsoleteResponse.ClientActions.Should().BeEmpty();
        parsedUpdateObsoleteResponse.Instance.Should().NotBeNull();
        parsedUpdateObsoleteResponse.Instance.Id.Should().Be($"{instanceOwner}/{instanceGuid}");
        var updatedObsoleteDataElement = parsedUpdateObsoleteResponse.Instance.Data.Should().ContainSingle().Which;
        var updatedObsoleteSchemeElement = parsedUpdateObsoleteResponse
            .UpdatedDataModels.Should()
            .HaveCount(1)
            .And.ContainKey(updatedObsoleteDataElement.Id)
            .WhoseValue.Should()
            .BeOfType<JsonElement>()
            .Which;
        var updatedObsoleteScheme =
            updatedObsoleteSchemeElement.Deserialize<Scheme>(_jsonSerializerOptions)
            ?? throw new Exception("Failed to deserialize Scheme");
        updatedObsoleteScheme.description.Should().Be("Obsolete data");

        TestData
            .GetDataElementBlobContnet(org, app, instanceOwner, instanceGuid, Guid.Parse(updatedDataElement.Id))
            .Should()
            .Contain("Obsolete data");

        // Run buttonId "delete"
        using var deleteContent = JsonContent.Create(new { action = "fill", buttonId = "delete" });
        using HttpResponseMessage deleteResponse = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwner}/{instanceGuid}/actions",
            deleteContent
        );
        var parsedDeleteResponse = await VerifyStatusAndDeserialize<UserActionResponse>(
            deleteResponse,
            HttpStatusCode.OK
        );
        parsedDeleteResponse.ClientActions.Should().BeEmpty();
        parsedDeleteResponse.Instance.Should().NotBeNull();
        parsedDeleteResponse.Instance.Id.Should().Be($"{instanceOwner}/{instanceGuid}");
        parsedDeleteResponse.Instance.Data.Should().BeEmpty();
        parsedDeleteResponse.UpdatedDataModels.Should().BeEmpty();

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, instanceOwner, instanceGuid);
    }

    [Fact]
    public async Task PerformFillAction_GetClientActions()
    {
        var org = "tdd";
        var app = "task-action";
        Guid instanceGuid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        int instanceOwner = 1337;
        TestData.PrepareInstance(org, app, 1337, instanceGuid);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, FillAction>();
        };
        var client = GetRootedUserClient(org, app, 1337);
        string token = TestAuthentication.GetUserToken(userId: 1001, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // run buttonId "getClientActions"
        using var getClientActionsContent = JsonContent.Create(new { action = "fill", buttonId = "getClientActions" });
        using HttpResponseMessage getClientActionsResponse = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwner}/{instanceGuid}/actions",
            getClientActionsContent
        );
        var parsedGetClientActionsResponse = await VerifyStatusAndDeserialize<UserActionResponse>(
            getClientActionsResponse,
            HttpStatusCode.OK
        );
        parsedGetClientActionsResponse.ClientActions.Should().ContainSingle().Which.Id.Should().Be("nextPage");

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, instanceOwner, instanceGuid);
    }

    [Fact]
    public async Task PerformFillAction_Fail()
    {
        var org = "tdd";
        var app = "task-action";
        Guid instanceGuid = new Guid("b1135209-628e-4a6e-9efd-e4282068ef41");
        int instanceOwner = 1337;
        TestData.PrepareInstance(org, app, 1337, instanceGuid);
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IUserAction, FillAction>();
        };
        var client = GetRootedUserClient(org, app, 1337);
        string token = TestAuthentication.GetUserToken(userId: 1001, authenticationLevel: 3);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Run buttonId "fail"
        using var failContent = JsonContent.Create(new { action = "fill", buttonId = "fail" });
        using HttpResponseMessage failResponse = await client.PostAsync(
            $"/{org}/{app}/instances/{instanceOwner}/{instanceGuid}/actions",
            failContent
        );
        var parsedFailResponse = await VerifyStatusAndDeserialize<UserActionResponse>(
            failResponse,
            HttpStatusCode.Conflict
        );
        parsedFailResponse.ClientActions.Should().ContainSingle().Which.Id.Should().Be("nextPage");
        parsedFailResponse.Error.Should().NotBeNull();
        parsedFailResponse.Error!.Code.Should().Be("machine-readable-error-code");
        parsedFailResponse.Error!.Message.Should().Be("Her kommer det en feilmelding");

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, instanceOwner, instanceGuid);
    }

    //TODO: replace this assertion with a proper one once fluentassertions has a json compare feature scheduled for v7 https://github.com/fluentassertions/fluentassertions/issues/2205
    private void CompareResult<T>(string expectedString, string actualString, Action<T?>? mutator = null)
    {
        _outputHelper.WriteLine($"Expected: {expectedString}");
        _outputHelper.WriteLine($"Actual: {actualString}");
        T? expected = JsonSerializer.Deserialize<T>(expectedString, _jsonSerializerOptions);
        T? actual = JsonSerializer.Deserialize<T>(actualString, _jsonSerializerOptions);
        mutator?.Invoke(actual);
        mutator?.Invoke(expected);
        actual.Should().BeEquivalentTo(expected);
    }

    [Theory]
    [MemberData(nameof(PartitionValidationIssuesByDataElement))]
    public void TestPartitionCodeForCompatibility(List<ValidationSourcePair> validationIssues, string expectedJson)
    {
        var partitionedIssues = ActionsController.PartitionValidationIssuesByDataElement(validationIssues);
        var json = JsonSerializer.Serialize(partitionedIssues);
        Assert.Equal(expectedJson, json);
    }

    public static TheoryData<List<ValidationSourcePair>, string> PartitionValidationIssuesByDataElement =>
        new()
        {
            { [new ValidationSourcePair("source", new List<ValidationIssueWithSource>())], """{"":{"source":[]}}""" },
            {
                [new ValidationSourcePair("source", []), new ValidationSourcePair("source2", [])],
                """{"":{"source":[],"source2":[]}}"""
            },
            {
                [
                    new ValidationSourcePair(
                        "source",
                        [
                            new()
                            {
                                DataElementId = "123445",
                                Severity = ValidationIssueSeverity.Unspecified,
                                Code = null,
                                Description = null,
                                Source = "null",
                            },
                        ]
                    ),
                ],
                """{"123445":{"source":[{"severity":0,"dataElementId":"123445","field":null,"code":null,"description":null,"source":"null"}]}}"""
            },
            {
                [
                    new ValidationSourcePair(
                        "source",
                        [
                            new()
                            {
                                DataElementId = "123445",
                                Severity = ValidationIssueSeverity.Unspecified,
                                Code = null,
                                Description = null,
                                Source = "null",
                            },
                        ]
                    ),
                    new ValidationSourcePair(
                        "source2",
                        [
                            new()
                            {
                                DataElementId = "123445",
                                Severity = ValidationIssueSeverity.Unspecified,
                                Code = null,
                                Description = null,
                                Source = "null",
                            },
                        ]
                    ),
                ],
                """{"123445":{"source":[{"severity":0,"dataElementId":"123445","field":null,"code":null,"description":null,"source":"null"}],"source2":[{"severity":0,"dataElementId":"123445","field":null,"code":null,"description":null,"source":"null"}]}}"""
            },
            {
                [
                    new ValidationSourcePair(
                        "source",
                        [
                            new()
                            {
                                Severity = ValidationIssueSeverity.Unspecified,
                                Code = null,
                                Description = null,
                                Source = "null",
                            },
                        ]
                    ),
                    new ValidationSourcePair(
                        "source2",
                        [
                            new()
                            {
                                DataElementId = "123445",
                                Severity = ValidationIssueSeverity.Unspecified,
                                Code = null,
                                Description = null,
                                Source = "null",
                            },
                        ]
                    ),
                ],
                """{"":{"source":[{"severity":0,"dataElementId":null,"field":null,"code":null,"description":null,"source":"null"}]},"123445":{"source2":[{"severity":0,"dataElementId":"123445","field":null,"code":null,"description":null,"source":"null"}]}}"""
            },
        };
}

public class FillAction : IUserAction
{
    private readonly ILogger<FillAction> _logger;
    private readonly IDataClient _dataClient;

    public string Id => "fill";

    public FillAction(ILogger<FillAction> logger, IDataClient dataClient)
    {
        _logger = logger;
        _dataClient = dataClient;
    }

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        _logger.LogInformation("FillAction triggered, with button id: {buttonId}", context.ButtonId);

        switch (context.ButtonId)
        {
            case "add":
                context.DataMutator.AddFormDataElement(
                    "Scheme",
                    new Scheme()
                    {
                        TestCustomButtonReadOnlyInput = "Første runde",
                        TestCustomButtonInput = "Hello a",
                        description = "Første runde",
                    }
                );
                break;
            case "update":
                var dataType =
                    context.DataMutator.GetDataType("Scheme") ?? throw new Exception("DataType \"Scheme\" not found");
                var originalDataElement = context.DataMutator.GetDataElementsForType(dataType).First();
                var data = await context.DataMutator.GetFormData<Scheme>(originalDataElement);

                data.TestCustomButtonReadOnlyInput = "Her kommer det data fra backend";
                break;
            case "updateObsolete":
                var instanceId = context.Instance.Id;
                var instanceGuid = Guid.Parse(instanceId.Split('/')[1]);
                var instanceOwner = int.Parse(instanceId.Split('/')[0]);
                var dataGuid = Guid.Parse(context.Instance.Data.Single().Id);

                var obsoleteData = (Scheme)
                    await _dataClient.GetFormData(
                        instanceGuid,
                        typeof(Scheme),
                        context.Instance.Org,
                        context.Instance.AppId.Split('/')[1],
                        instanceOwner,
                        dataGuid
                    );
                obsoleteData.description = "Obsolete data";
                var result = UserActionResult.SuccessResult(new List<ClientAction>());
                result.AddUpdatedDataModel(dataGuid.ToString(), obsoleteData);
                return result;
            case "delete":
                var elementToDelete = context.DataMutator.GetDataElementsForType("Scheme").First();
                context.DataMutator.RemoveDataElement(elementToDelete);
                break;
            case "getClientActions":
                return UserActionResult.SuccessResult([new ClientAction() { Id = "nextPage" }]);

            case "fail":
                return UserActionResult.FailureResult(
                    new ActionError()
                    {
                        Code = "machine-readable-error-code",
                        Message = "Her kommer det en feilmelding",
                        Metadata = new Dictionary<string, string>() { { "key1", "value1" } },
                    },
                    [new ClientAction() { Id = "nextPage" }],
                    errorType: ProcessErrorType.Conflict
                );
            default:
                throw new Exception($"Button id {context.ButtonId} not supported");
        }

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }
}

public class LookupAction : IUserAction
{
    public string Id => "lookup";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        await Task.CompletedTask;
        if (context.UserId == 400)
        {
            return UserActionResult.FailureResult(new ActionError(), errorType: ProcessErrorType.BadRequest);
        }

        if (context.UserId == 401)
        {
            return UserActionResult.FailureResult(new ActionError(), errorType: ProcessErrorType.Unauthorized);
        }

        if (context.UserId == 409)
        {
            return UserActionResult.FailureResult(new ActionError(), errorType: ProcessErrorType.Conflict);
        }

        if (context.UserId == 500)
        {
            return UserActionResult.FailureResult(new ActionError(), errorType: ProcessErrorType.Internal);
        }
        return UserActionResult.SuccessResult(new List<ClientAction>() { ClientAction.NextPage() });
    }
}
