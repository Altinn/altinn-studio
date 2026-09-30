using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataController_PutTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IDataProcessor> _dataProcessor = new(MockBehavior.Strict);
    private readonly Mock<IDataWriteProcessor> _dataWriteProcessor = new(MockBehavior.Strict);

    public DataController_PutTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessor.Object);
            services.AddSingleton(_dataWriteProcessor.Object);
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
        string token = TestAuthentication.GetUserToken(1337, instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        _dataProcessor
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<object>(),
                    It.IsAny<object>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Exactly(1));
        _dataProcessor
            .Setup(p =>
                p.ProcessDataRead(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<object>(), It.IsAny<string?>())
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Exactly(1));
        _dataWriteProcessor
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<string>(),
                    It.IsAny<DataElementChanges>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Exactly(2));

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<Instance>(createResponse, HttpStatusCode.Created);
        var instanceId = createResponseParsed.Id;

        // Re-fetch instance to get data elements (created by ProcessEngine during task start)
        var getInstanceResponse = await client.GetAsync($"{org}/{app}/instances/{instanceId}");
        var instanceWithData = await VerifyStatusAndDeserialize<Instance>(getInstanceResponse, HttpStatusCode.OK);
        var dataGuid = instanceWithData.Data.First(x => x.DataType.Equals("default")).Id;

        // Update data element
        using var updateDataElementContent = new StringContent(
            """{"melding":{"name": "Ola Olsen"}}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );
        var response = await client.PutAsync(
            $"/{org}/{app}/instances/{instanceId}/data/{dataGuid}",
            updateDataElementContent
        );
        OutputHelper.WriteLine(await response.Content.ReadAsStringAsync());
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        // Verify stored data
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");
        var readDataElementResponseParsed = await VerifyStatusAndDeserialize<Skjema>(
            readDataElementResponse,
            HttpStatusCode.OK
        );
        readDataElementResponseParsed.Melding!.Name.Should().Be("Ola Olsen");

        TestData.DeleteInstanceAndData(org, app, instanceId);

        _dataProcessor.Verify(
            p =>
                p.ProcessDataRead(
                    It.IsAny<Instance>(),
                    It.Is<Guid>(dataId => dataId == Guid.Parse(dataGuid)),
                    It.IsAny<Skjema>(),
                    null
                ),
            Times.Exactly(1)
        );
        _dataProcessor.Verify(
            p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.Is<Guid>(dataId => dataId == Guid.Parse(dataGuid)),
                    It.IsAny<Skjema>(),
                    It.IsAny<Skjema?>(),
                    null
                ),
            // Note: First write circumvents the DataController, through autoCreate=true -> ProcessTaskInitializer
            Times.Exactly(1)
        );
        _dataProcessor.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task PutDataElement_TestMultiPartUpdateWithCustomDataProcessor_ReturnsOk()
    {
        // Run the previous test with a custom data processor
        _dataProcessor
            .Setup(d =>
                d.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid dataGuid, object data, object previousData, string? language) =>
                {
                    if (data is Skjema skjema)
                    {
                        skjema.Melding!.Toggle = true;
                    }

                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Exactly(1));

        _dataProcessor
            .Setup(p =>
                p.ProcessDataRead(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<object>(), It.IsAny<string?>())
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Exactly(2));
        _dataWriteProcessor
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<string>(),
                    It.IsAny<DataElementChanges>(),
                    It.IsAny<string?>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Exactly(2));

        // Run previous test with different setup
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 501337;
        HttpClient client = GetRootedClient(org, app);
        string token = TestAuthentication.GetUserToken(1337, instanceOwnerPartyId);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);

        // Create instance
        var createResponse = await client.PostAsync(
            $"{org}/{app}/instances/?instanceOwnerPartyId={instanceOwnerPartyId}",
            null
        );
        var createResponseParsed = await VerifyStatusAndDeserialize<Instance>(createResponse, HttpStatusCode.Created);
        var instanceId = createResponseParsed.Id;

        // Re-fetch instance to get data elements (created by ProcessEngine during task start)
        var getInstanceResponse = await client.GetAsync($"{org}/{app}/instances/{instanceId}");
        var instanceWithData = await VerifyStatusAndDeserialize<Instance>(getInstanceResponse, HttpStatusCode.OK);
        var dataGuid = instanceWithData.Data.First(x => x.DataType.Equals("default")).Id;

        // Verify stored data
        var firstReadDataElementResponse = await client.GetAsync(
            $"/{org}/{app}/instances/{instanceId}/data/{dataGuid}"
        );
        var firstReadDataElementResponseParsed = await VerifyStatusAndDeserialize<Skjema>(
            firstReadDataElementResponse,
            HttpStatusCode.OK
        );
        firstReadDataElementResponseParsed.Melding.Should().BeNull();

        // Update data element
        using var updateDataElementContent = new StringContent(
            """{"melding":{"name": "Ola Olsen"}}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );
        var response = await client.PutAsync(
            $"/{org}/{app}/instances/{instanceId}/data/{dataGuid}",
            updateDataElementContent
        );
        response.Should().HaveStatusCode(HttpStatusCode.OK);

        // Verify stored data
        var readDataElementResponse = await client.GetAsync($"/{org}/{app}/instances/{instanceId}/data/{dataGuid}");

        var readDataElementResponseParsed = await VerifyStatusAndDeserialize<Skjema>(
            readDataElementResponse,
            HttpStatusCode.OK
        );
        readDataElementResponseParsed.Melding!.Name.Should().Be("Ola Olsen");
        readDataElementResponseParsed.Melding.Toggle.Should().BeTrue();

        TestData.DeleteInstanceAndData(org, app, instanceId);

        _dataProcessor.Verify();
        _dataWriteProcessor.Verify();
    }

    [Theory]
    [InlineData(
        """{"melding":{"name": 123}}""",
        "The JSON value could not be converted to System.String. Path: $.melding.name | LineNumber: 0 | BytePositionInLine: 23."
    )]
    [InlineData(
        """ d{"melding":{}}""",
        "'d' is an invalid start of a value. Path: $ | LineNumber: 0 | BytePositionInLine: 1."
    )]
    [InlineData(
        """{"melding":{"name": "Ola Olsen", "not-found": [}}""",
        "'}' is an invalid start of a value. Path: $.melding.not-found | LineNumber: 0 | BytePositionInLine: 47."
    )]
    public async Task PutDataElement_InvalidData_ReturnsBadRequest(string json, string expectedDescription)
    {
        // Setup test data
        string org = "tdd";
        string app = "contributer-restriction";
        var instanceOwnerPartyId = 500600;
        var instanceId = Guid.Parse("00000000-DEAD-0000-BABE-000000000999");
        var dataGuid = Guid.Parse("cd691c32-0000-4555-8aee-0b7054a413e4");
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceId);

        OverrideServicesForThisTest = services =>
        {
            services.AddTelemetrySink(additionalActivitySources: source => source.Name == "Microsoft.AspNetCore");
        };

        var client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);

        // Update data element
        using var updateDataElementContent = new StringContent(
            json, // Name should be a string, not a number
            System.Text.Encoding.UTF8,
            "application/json"
        );
        var response = await client.PutAsync(
            $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceId}/data/{dataGuid}",
            updateDataElementContent
        );

        var responseText = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseText);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var telemetrySnapshot = await GetTelemetrySnapshot(numberOfActivities: 1, numberOfMetrics: 0);
        var responseObject = System.Text.Json.JsonSerializer.Deserialize<ProblemDetails>(responseText);
        Assert.Equal("Failed to deserialize JSON", responseObject?.Title);
        Assert.Equal(expectedDescription, responseObject?.Detail);
        Assert.Equal(StatusCodes.Status400BadRequest, responseObject?.Status);

        telemetrySnapshot
            .Activities.Should()
            .ContainSingle(a => a.Name == "SerializationService.DeserializeJson")
            .Which.Events.Should()
            .ContainSingle(e => e.Name == "exception")
            .Which.Tags.Should()
            .ContainSingle(t => t.Key == "exception.type")
            .Which.Value.Should()
            .Be("System.Text.Json.JsonException");

        TestData.DeleteInstanceAndData(org, app, instanceOwnerPartyId, instanceId);
    }
}
