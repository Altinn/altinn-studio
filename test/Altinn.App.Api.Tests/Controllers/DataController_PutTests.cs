using System.Net;
using System.Net.Http.Headers;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
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
        var dataGuid = createResponseParsed.Data.First(x => x.DataType.Equals("default")).Id;

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
        var dataGuid = createResponseParsed.Data.First(x => x.DataType.Equals("default")).Id;

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
        )!;
        readDataElementResponseParsed.Melding!.Name.Should().Be("Ola Olsen");
        readDataElementResponseParsed.Melding.Toggle.Should().BeTrue();

        TestData.DeleteInstanceAndData(org, app, instanceId);

        _dataProcessor.Verify();
        _dataWriteProcessor.Verify();
    }
}
