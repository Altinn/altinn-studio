using System.Net;
using System.Net.Http.Headers;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class ValidateControllerValidateInstanceTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private static readonly Guid InstanceGuid = new("3102f61d-1446-4ca5-9fed-3c7c7d67249c");
    private static readonly string InstanceId = $"{InstanceOwnerPartyId}/{InstanceGuid}";
    private static readonly Guid DataGuid = new("5240d834-dca6-44d3-b99a-1b7ca9b862af");
    protected static new readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict);

    public ValidateControllerValidateInstanceTests(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper)
    {
        _formDataValidatorMock.Setup(v => v.DataType).Returns("9edd53de-f46f-40a1-bb4d-3efb93dc113d");
        _formDataValidatorMock.Setup(v => v.ValidationSource).Returns("Not a valid validation source");
        _formDataValidatorMock.SetupGet(fdv => fdv.NoIncrementalValidation).Returns(false);
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessorMock.Object);
            services.AddSingleton(_formDataValidatorMock.Object);
        };
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, InstanceGuid);
    }

    private async Task<HttpResponseMessage> CallValidateInstanceApi()
    {
        using var httpClient = GetRootedClient(Org, App);
        string token = TestAuthentication.GetUserToken(userId: 1337);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            token
        );
        return await httpClient.GetAsync($"/{Org}/{App}/instances/{InstanceId}/validate");
    }

    private async Task<(HttpResponseMessage response, string responseString)> CallValidateDataApi()
    {
        using var httpClient = GetRootedClient(Org, App);
        string token = TestAuthentication.GetUserToken(userId: 1337);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            token
        );
        var response = await httpClient.GetAsync($"/{Org}/{App}/instances/{InstanceId}/data/{DataGuid}/validate");
        var responseString = await LogResponse(response);
        return (response, responseString);
    }

    private async Task<string> LogResponse(HttpResponseMessage response)
    {
        var responseString = await response.Content.ReadAsStringAsync();
        using var responseParsedRaw = JsonDocument.Parse(responseString);
        OutputHelper.WriteLine(JsonSerializer.Serialize(responseParsedRaw, JsonSerializerOptions));
        return responseString;
    }

    private static TResponse ParseResponse<TResponse>(string responseString)
    {
        return JsonSerializer.Deserialize<TResponse>(responseString, JsonSerializerOptions)!;
    }

    [Fact]
    public async Task ValidateInstance_NoSetup()
    {
        var response = await CallValidateInstanceApi();
        var responseString = await LogResponse(response);

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        var parsedResponse = ParseResponse<List<ValidationIssue>>(responseString);
        parsedResponse.Should().BeEmpty();

        _dataProcessorMock.Verify();
        _formDataValidatorMock.Verify();
    }

    [Fact]
    public async Task ValidateInstance_WithLegacyFormDataValidator()
    {
        var oldTaskValidatorMock = new Mock<IInstanceValidator>(MockBehavior.Strict);

        oldTaskValidatorMock
            .Setup(v => v.ValidateTask(It.IsAny<Instance>(), "Task_1", It.IsAny<ModelStateDictionary>()))
            .Returns(
                (Instance instance, string task, ModelStateDictionary issues) =>
                {
                    issues.AddModelError("**SHOULD_BE_IGNORED**", "TaskErrorText");
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);
        oldTaskValidatorMock
            .Setup(v => v.ValidateData(It.IsAny<object>(), It.IsAny<ModelStateDictionary>()))
            .Returns(
                (object data, ModelStateDictionary issues) =>
                {
                    issues.AddModelError((Skjema s) => s.Melding!.NestedList, "*FIXED*CustomErrorText");
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(oldTaskValidatorMock.Object);
        };
        var response = await CallValidateInstanceApi();
        var responseString = await LogResponse(response);

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        var parsedResponse = ParseResponse<List<ValidationIssue>>(responseString);
        parsedResponse.Should().HaveCount(2);
        var taskIssue = parsedResponse.Should().ContainSingle(i => i.DataElementId == null).Which;
        taskIssue.Field.Should().BeNull();
        taskIssue.Description.Should().Be("TaskErrorText");
        taskIssue.Severity.Should().Be(ValidationIssueSeverity.Error);

        var dataIssue = parsedResponse.Should().ContainSingle(i => i.DataElementId != null).Which;
        dataIssue.Field.Should().Be("melding.nested_list");
        dataIssue.Description.Should().Be("CustomErrorText");
        dataIssue.Severity.Should().Be(ValidationIssueSeverity.Fixed);

        _dataProcessorMock.Verify();
        _formDataValidatorMock.Verify();
        oldTaskValidatorMock.Verify();
    }
}
