using Altinn.App.Api.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net.Http.Headers;
using System.Net;
using System.Text.Json;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Features;
using Xunit;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Api.Tests.Controllers;

public class DataController_PutTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IDataProcessor> _dataProcessor = new();

    private static readonly JsonSerializerOptions JsonSerializerOptions = new ()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public DataController_PutTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessor.Object);
        };
    }

    [Fact]
    public async Task PutDataElement_TestSinglePartUpdate_ReturnsOk()
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = PrincipalUtil.GetToken(1337, null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create instance
        var createResponse =
            await client.PostAsync($"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}", null);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createResponseParsed = JsonSerializer.Deserialize<Instance>(createResponseContent, JsonSerializerOptions)!;
        var instanceId = createResponseParsed.Id;

        // Create data element (not sure why it isn't created when the instance is created, autoCreate is true)
        using var createDataElementContent =
            new StringContent("""{"melding":{"name": "Ivar"}}""", System.Text.Encoding.UTF8, "application/json");
        var createDataElementResponse =
            await client.PostAsync($"/{org}/{app}/instances/{instanceId}/data?dataType=default", createDataElementContent);
        var createDataElementResponseContent = await createDataElementResponse.Content.ReadAsStringAsync();
        createDataElementResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createDataElementResponseParsed =
            JsonSerializer.Deserialize<DataElement>(createDataElementResponseContent, JsonSerializerOptions)!;
        var dataGuid = createDataElementResponseParsed.Id;
        
        // Update data element
        using var updateDataElementContent =
            new StringContent("""{"melding":{"name": "Ola Olsen"}}""", System.Text.Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}", updateDataElementContent);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // Verify stored data
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        readDataElementResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var readDataElementResponseContent = await readDataElementResponse.Content.ReadAsStringAsync();
        var readDataElementResponseParsed =
            JsonSerializer.Deserialize<Skjema>(readDataElementResponseContent)!;
        readDataElementResponseParsed.Melding!.Name.Should().Be("Ola Olsen");

        _dataProcessor.Verify(p => p.ProcessDataRead(It.IsAny<Instance>(), It.Is<Guid>(dataId => dataId == Guid.Parse(dataGuid)), It.IsAny<Skjema>(), null), Times.Exactly(1));
        _dataProcessor.Verify(p => p.ProcessDataWrite(It.IsAny<Instance>(), It.Is<Guid>(dataId => dataId == Guid.Parse(dataGuid)), It.IsAny<Skjema>(), It.IsAny<Skjema?>(), null), Times.Exactly(1)); // TODO: Shouldn't this be 2 because of the first write?
        _dataProcessor.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task PutDataElement_TestMultiPartUpdateWithCustomDataProcessor_ReturnsOk()
    {
        // Run the previous test with a custom data processor
        _dataProcessor.Setup(d => d.ProcessDataWrite(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<object>(), It.IsAny<object?>(), null))
            .Returns((Instance instance, Guid dataGuid, object data, object previousData, string? language) =>
            {
                if (data is Skjema skjema)
                {
                    skjema.Melding!.Toggle = true;
                }

                return Task.CompletedTask;
            });
        
        // Run previous test with different setup
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = PrincipalUtil.GetToken(1337, null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Create instance
        var createResponse =
            await client.PostAsync($"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}", null);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createResponseParsed = JsonSerializer.Deserialize<Instance>(createResponseContent, JsonSerializerOptions)!;
        var instanceId = createResponseParsed.Id;

        // Create data element (not sure why it isn't created when the instance is created, autoCreate is true)
        using var createDataElementContent =
            new StringContent("""{"melding":{"name": "Ivar"}}""", System.Text.Encoding.UTF8, "application/json");
        var createDataElementResponse =
            await client.PostAsync($"/{org}/{app}/instances/{instanceId}/data?dataType=default",
                createDataElementContent);
        var createDataElementResponseContent = await createDataElementResponse.Content.ReadAsStringAsync();
        createDataElementResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createDataElementResponseParsed =
            JsonSerializer.Deserialize<DataElement>(createDataElementResponseContent, JsonSerializerOptions)!;
        var dataGuid = createDataElementResponseParsed.Id;
        
        // Verify stored data
        var firstReadDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        var firstReadDataElementResponseContent = await firstReadDataElementResponse.Content.ReadAsStringAsync();
        var firstReadDataElementResponseParsed =
            JsonSerializer.Deserialize<Skjema>(firstReadDataElementResponseContent)!;
        firstReadDataElementResponseParsed.Melding!.Name.Should().Be("Ivar");
        firstReadDataElementResponseParsed.Melding.Toggle.Should().BeFalse();

        // Update data element
        using var updateDataElementContent =
            new StringContent("""{"melding":{"name": "Ola Olsen"}}""", System.Text.Encoding.UTF8, "application/json");
        var response = await client.PutAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}", updateDataElementContent);
        response.StatusCode.Should().Be(HttpStatusCode.OK);


        // Verify stored data
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        var readDataElementResponseContent = await readDataElementResponse.Content.ReadAsStringAsync();
        var readDataElementResponseParsed =
            JsonSerializer.Deserialize<Skjema>(readDataElementResponseContent)!;
        readDataElementResponseParsed.Melding!.Name.Should().Be("Ola Olsen");
        readDataElementResponseParsed.Melding.Toggle.Should().BeTrue();

        _dataProcessor.Verify(p=>p.ProcessDataRead(It.IsAny<Instance>(), It.Is<Guid>(dataId => dataId == Guid.Parse(dataGuid)), It.IsAny<Skjema>(), null), Times.Exactly(2));
        _dataProcessor.Verify(p => p.ProcessDataWrite(It.IsAny<Instance>(), It.Is<Guid>(dataId => dataId == Guid.Parse(dataGuid)), It.IsAny<Skjema>(), It.IsAny<Skjema?>(), null), Times.Exactly(1)); // TODO: Shouldn't this be 2 because of the first write?
        _dataProcessor.VerifyNoOtherCalls();
        
    }


}