using System.Net;
using System.Net.Http.Headers;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class ProcessControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    // Define constants
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private static readonly Guid InstanceGuid = new("5a2fa5ec-f97c-4816-b57a-dc78a981917e");
    private static readonly string InstanceId = $"{InstanceOwnerPartyId}/{InstanceGuid}";
    private static readonly Guid DataGuid = new("cd691c32-ae36-4555-8aee-0b7054a413e4");

    // Define mocks
    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict);

    private static readonly JsonSerializerOptions JsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    // Constructor with common setup
    public ProcessControllerTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper) : base(factory, outputHelper)
    {
        _formDataValidatorMock.Setup(v => v.DataType).Returns("Not a valid data type");
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessorMock.Object);
            services.AddSingleton(_formDataValidatorMock.Object);
        };
        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, InstanceGuid);
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, InstanceGuid);
    }

    [Fact]
    public async Task Get_ShouldReturnProcessTasks()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int partyId = 500000;
        Guid instanceId = new Guid("5d9e906b-83ed-44df-85a7-2f104c640bff");

        HttpClient client = GetRootedClient(org, app, 1337, partyId, 3);

        TestData.DeleteInstance(org, app, partyId, instanceId);
        TestData.PrepareInstance(org, app, partyId, instanceId);

        string url = $"/{org}/{app}/instances/{partyId}/{instanceId}/process";
        HttpResponseMessage response = await client.GetAsync(url);
        TestData.DeleteInstance(org, app, partyId, instanceId);

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
    public async Task RunProcessNext()
    {
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };
        using var client = GetRootedClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{InstanceId}/process/next", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        _outputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

    }

    [Fact]
    public async Task RunProcessNextWithLang()
    {
        var language = "es";
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");

            var content = await message.Content!.ReadAsStringAsync();

            _outputHelper.WriteLine("pdf request content:");
            _outputHelper.WriteLine(content);
            _outputHelper.WriteLine("");

            using var document = JsonDocument.Parse(content);
            document.RootElement.GetProperty("url").GetString().Should().Contain($"lang={language}");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };
        using var client = GetRootedClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{InstanceId}/process/next?lang={language}", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        _outputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
    }

    [Fact]
    public async Task RunProcessNextWithLanguage()
    {
        var language = "es";
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");

            var content = await message.Content!.ReadAsStringAsync();

            _outputHelper.WriteLine("pdf request content:");
            _outputHelper.WriteLine(content);
            _outputHelper.WriteLine("");

            using var document = JsonDocument.Parse(content);
            document.RootElement.GetProperty("url").GetString().Should().Contain($"lang={language}");

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };
        using var client = GetRootedClient(Org, App, 1337, InstanceOwnerPartyId);
        var nextResponse = await client.PutAsync($"{Org}/{App}/instances/{InstanceId}/process/next?language={language}", null);
        var nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        _outputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
    }



    //TODO: replace this assertion with a proper one once fluentassertions has a json compare feature scheduled for v7 https://github.com/fluentassertions/fluentassertions/issues/2205
    private static void CompareResult<T>(string expectedString, string actualString)
    {
        T? expected = JsonSerializer.Deserialize<T>(expectedString);
        T? actual = JsonSerializer.Deserialize<T>(actualString);
        actual.Should().BeEquivalentTo(expected);
    }
}