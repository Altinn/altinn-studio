using System.Net;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Argon;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Process.ServiceTasks.EFormidling;

public class EFormidlingServiceTaskTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "service-tasks";
    private const int InstanceOwnerPartyId = 501337; //Sofie Salt
    private const string Language = "nb";
    private static readonly Guid _instanceGuid = new("b1af1cfd-db99-45f9-9625-9dfa1223485f");
    private static readonly string _instanceId = $"{InstanceOwnerPartyId}/{_instanceGuid}";

    private readonly Mock<IEFormidlingService> _eFormidlingServiceMock = new();

    public EFormidlingServiceTaskTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_eFormidlingServiceMock.Object);
            services.AddTransient<IProcessClient, ProcessClientMock>();
        };

        // The task concludes only once delivery is confirmed, so the default here is an
        // already-delivered shipment. A test that wants the wait itself overrides this.
        SetupShipmentStatus(EFormidlingDeliveryState.Delivered, "levert");

        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task Can_Set_EFormidlingServiceTask_As_CurrentTask()
    {
        SendAsync = message =>
        {
            if (message.RequestUri!.PathAndQuery.Contains("pdf"))
            {
                return Task.FromResult(
                    new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("this is the binary pdf content"),
                    }
                );
            }

            throw new Exception($"Not mocked http request: {message.RequestUri!.PathAndQuery}");
        };

        using HttpClient client = GetRootedUserClient(Org, App);

        // Run process next
        using HttpResponseMessage nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        string nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);

        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Can_Execute_EFormidlingServiceTask_And_Move_To_Next_Task()
    {
        // Make sure a request to eFormidling is made
        SendAsync = message =>
        {
            if (message.RequestUri!.PathAndQuery.Contains("pdf"))
            {
                return Task.FromResult(
                    new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("this is the binary pdf content"),
                    }
                );
            }

            throw new Exception($"Not mocked http request: {message.RequestUri!.PathAndQuery}");
        };

        using HttpClient client = GetRootedUserClient(Org, App);

        // Run process next to move from PdfServiceTask to EFormidlingServiceTask
        using HttpResponseMessage processNextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        string nextResponseContent = await processNextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        processNextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Check that the process has been moved to end task
        var processState = JsonConvert.DeserializeObject<ProcessState>(nextResponseContent);
        processState.Ended.Should().NotBeNull();
    }

    [Fact]
    public async Task Does_Not_Change_Task_When_EFormidling_Fails()
    {
        // Make sure a request to eFormidling is made
        SendAsync = message =>
        {
            if (message.RequestUri!.PathAndQuery.Contains("pdf"))
            {
                return Task.FromResult(
                    new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("this is the binary pdf content"),
                    }
                );
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        };

        // Setup eFormidling service to throw exception
        _eFormidlingServiceMock
            .Setup(x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception());

        using HttpClient client = GetRootedUserClient(Org, App);

        // Run process next to move from PdfServiceTask to EFormidlingServiceTask
        using HttpResponseMessage firstNextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        firstNextResponse.Should().HaveStatusCode(HttpStatusCode.InternalServerError);

        // The target service task is durable before its external side effect executes.
        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_3");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be("eFormidling");
    }

    [Fact]
    public async Task Waits_For_Delivery_And_Sends_The_Shipment_Only_Once()
    {
        SendAsync = message =>
        {
            if (message.RequestUri!.PathAndQuery.Contains("pdf"))
            {
                return Task.FromResult(
                    new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("this is the binary pdf content"),
                    }
                );
            }

            throw new Exception($"Not mocked http request: {message.RequestUri!.PathAndQuery}");
        };

        // Pending, pending, then delivered: the task defers twice before concluding.
        Queue<EFormidlingShipmentStatus> statuses = new([
            new EFormidlingShipmentStatus { State = EFormidlingDeliveryState.Pending, Status = "opprettet" },
            new EFormidlingShipmentStatus { State = EFormidlingDeliveryState.Pending, Status = "sendt" },
            new EFormidlingShipmentStatus { State = EFormidlingDeliveryState.Delivered, Status = "levert" },
        ]);
        _eFormidlingServiceMock
            .Setup(x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => statuses.Count > 1 ? statuses.Dequeue() : statuses.Peek());

        using HttpClient client = GetRootedUserClient(Org, App);

        using HttpResponseMessage nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        string nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);
        nextResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // The wait ran to a conclusion, and the process advanced only then.
        _eFormidlingServiceMock.Verify(
            x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(3)
        );

        // The point of giving the send its own stage: the engine records the stage as completed, so
        // re-checking delivery never re-sends. A single deferring task would have re-run the send on
        // every poll.
        _eFormidlingServiceMock.Verify(
            x =>
                x.SendEFormidlingShipment(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Does_Not_Change_Task_When_Shipment_Delivery_Fails()
    {
        // The shipment leaves the app fine; the integrasjonspunkt then reports it as terminally
        // failed. The transition must not complete, and the instance must stay on the task.
        SendAsync = message =>
        {
            if (message.RequestUri!.PathAndQuery.Contains("pdf"))
            {
                return Task.FromResult(
                    new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent("this is the binary pdf content"),
                    }
                );
            }

            throw new Exception($"Not mocked http request: {message.RequestUri!.PathAndQuery}");
        };

        SetupShipmentStatus(EFormidlingDeliveryState.Failed, "feil", "Mottaker er ikke registrert");

        using HttpClient client = GetRootedUserClient(Org, App);

        using HttpResponseMessage nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        nextResponse.Should().HaveStatusCode(HttpStatusCode.InternalServerError);

        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_3");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be("eFormidling");
    }

    private void SetupShipmentStatus(EFormidlingDeliveryState state, string? status, string? description = null) =>
        _eFormidlingServiceMock
            .Setup(x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new EFormidlingShipmentStatus
                {
                    State = state,
                    Status = status,
                    Description = description,
                }
            );
}
