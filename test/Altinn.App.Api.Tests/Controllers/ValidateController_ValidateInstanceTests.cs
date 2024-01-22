using Altinn.App.Api.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Headers;
using System.Net;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Xunit;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
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

    private readonly Mock<IDataProcessor> _dataProcessorMock = new();
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new();

    private static readonly JsonSerializerOptions JsonSerializerOptions = new ()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly ITestOutputHelper _outputHelper;

    public ValidateControllerValidateInstanceTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper) : base(factory)
    {
        _formDataValidatorMock.Setup(v => v.DataType).Returns("Not a valid data type");
        _outputHelper = outputHelper;
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessorMock.Object);
            services.AddSingleton(_formDataValidatorMock.Object);
        };
        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, InstanceGuid);
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, InstanceGuid);
    }

    private async Task<HttpResponseMessage> CallValidateInstanceApi()
    {
        using var httpClient = GetRootedClient(Org, App);
        string token = PrincipalUtil.GetToken(1337, null);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await httpClient.GetAsync($"/{Org}/{App}/instances/{InstanceId}/validate");
    }

    private async Task<(HttpResponseMessage response, string responseString)> CallValidateDataApi()
    {
        using var httpClient = GetRootedClient(Org, App);
        string token = PrincipalUtil.GetToken(1337, null);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await httpClient.GetAsync($"/{Org}/{App}/instances/{InstanceId}/data/{DataGuid}/validate");
        var responseString = await LogResponse(response);
        return (response, responseString);
    }

    private async Task<string> LogResponse(HttpResponseMessage response)
    {
        var responseString = await response.Content.ReadAsStringAsync();
        using var responseParsedRaw = JsonDocument.Parse(responseString);
        _outputHelper.WriteLine(JsonSerializer.Serialize(responseParsedRaw, JsonSerializerOptions));
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

        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ValidateInstance_WithTaskValidator()
    {
        var oldTaskValidatorMock = new Mock<IInstanceValidator>(MockBehavior.Strict);

        oldTaskValidatorMock.Setup(v => v.ValidateTask(It.IsAny<Instance>(), "Task_1", It.IsAny<ModelStateDictionary>()))
            .Returns(
                (Instance instance, string task, ModelStateDictionary issues) =>
                {
                    issues.AddModelError((Skjema s)=>s.Melding.NestedList, "CustomErrorText");
                    return Task.CompletedTask;
                }).Verifiable(Times.Once);

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(oldTaskValidatorMock.Object);
        };
        var response = await CallValidateInstanceApi();
        var responseString = await LogResponse(response);

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        var parsedResponse = ParseResponse<List<ValidationIssue>>(responseString);
        var singleIssue = parsedResponse.Should().ContainSingle().Which;
        singleIssue.Field.Should().BeNull();
        singleIssue.Code.Should().Be("CustomErrorText");
        singleIssue.Severity.Should().Be(ValidationIssueSeverity.Error);

        _dataProcessorMock.VerifyNoOtherCalls();
        oldTaskValidatorMock.Verify();
        oldTaskValidatorMock.VerifyNoOtherCalls();
    }

}