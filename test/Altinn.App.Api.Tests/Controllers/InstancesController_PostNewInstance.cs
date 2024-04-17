using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Api.Tests.Utils;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class InstancesController_PostNewInstanceTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly Mock<IDataProcessor> _dataProcessor = new();

    public InstancesController_PostNewInstanceTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper) : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessor.Object);
        };
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
        string token = PrincipalUtil.GetToken(1337, null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent($$$"""<Skjema><melding><name>{{{testName}}}</name></melding></Skjema>""", System.Text.Encoding.UTF8, "application/xml"), "default");

        // Create instance
        var createResponse =
            await client.PostAsync($"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}", content);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created, createResponseContent);

        var createResponseParsed = JsonSerializer.Deserialize<Instance>(createResponseContent, _jsonSerializerOptions)!;

        // Verify Data id
        var instanceId = createResponseParsed.Id;
        createResponseParsed.Data.Should().HaveCount(1, "Create instance should create a data element");
        var dataGuid = createResponseParsed.Data.First().Id;


        // Verify stored data
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        readDataElementResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var readDataElementResponseContent = await readDataElementResponse.Content.ReadAsStringAsync();
        var readDataElementResponseParsed =
            JsonSerializer.Deserialize<Skjema>(readDataElementResponseContent)!;
        readDataElementResponseParsed.Melding!.Name.Should().Be(testName);
    }

    [Fact]
    public async Task PostNewInstanceWithInvalidData_EnsureInvalidResponse()
    {
        // Should probably be BadRequest, but this is what the current implementation returns
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = PrincipalUtil.GetToken(1337, null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("INVALID XML", System.Text.Encoding.UTF8, "application/xml"), "default");

        // Create instance
        var createResponse =
            await client.PostAsync($"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}", content);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        createResponse.StatusCode.Should().Be(HttpStatusCode.InternalServerError, createResponseContent);
        createResponseContent.Should().Contain("Instantiation of data elements failed");
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
        string token = PrincipalUtil.GetToken(1337, null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create instance data
        using var content = new MultipartFormDataContent();
        content.Add(new StringContent($$$"""<Skjema><melding><name>{{{testName}}}</name></melding></Skjema>""", System.Text.Encoding.UTF8, "application/xml"), "wrongName");

        // Create instance
        var createResponse =
            await client.PostAsync($"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}", content);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        createResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest, createResponseContent);
        createResponseContent.Should().Contain("Multipart section named, 'wrongName' does not correspond to an element");
    }
}
