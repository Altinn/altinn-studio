using System.Net;
using System.Text;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Argon;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Process.ServiceTasks.Pdf;

public class PdfServiceTaskTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "service-tasks";
    private const int InstanceOwnerPartyId = 501337; //Sofie Salt
    private const string Language = "nb";
    private static readonly Guid _instanceGuid = new("a2af1cfd-db99-45f9-9625-9dfa1223485f");
    private static readonly string _instanceId = $"{InstanceOwnerPartyId}/{_instanceGuid}";

    public PdfServiceTaskTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        var eFormidlingServiceMock = new Mock<IEFormidlingService>();
        var eFormidlingConfigurationProviderMock = new Mock<IEFormidlingLegacyConfigurationProvider>();
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(eFormidlingServiceMock.Object);
            services.AddSingleton(eFormidlingConfigurationProviderMock.Object);
        };

        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task Can_Reject_PdfServiceTask_If_It_Failed_And_Reject_Is_Configured()
    {
        var sendAsyncCalled = false;

        // Mock HttpClient for the expected pdf service call
        SendAsync = message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");
            sendAsyncCalled = true;

            // Simulate failing PDF service
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        };

        using HttpClient client = GetRootedUserClient(Org, App);

        // Run process next to enter PDF task
        using HttpResponseMessage nextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        string nextResponseContent = await nextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(nextResponseContent);

        nextResponse.Should().HaveStatusCode(HttpStatusCode.InternalServerError);
        sendAsyncCalled.Should().BeTrue();

        // Run process next with reject to return to data task
        var rejectProcessNext = new ProcessNext { Action = "reject" };
        using var rejectContent = new StringContent(
            JsonConvert.SerializeObject(rejectProcessNext),
            Encoding.UTF8,
            "application/json"
        );

        using HttpResponseMessage rejectResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            rejectContent
        );

        rejectResponse.Should().HaveStatusCode(HttpStatusCode.OK);

        // Double check that process moved back to the data task
        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_1");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be("data");
    }

    [Fact]
    public async Task Can_Execute_PdfServiceTask_And_Move_To_Next_Task()
    {
        var sendAsyncCalled = false;

        // Mock HttpClient for the expected pdf service call
        SendAsync = message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");
            sendAsyncCalled = true;

            return Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("this is the binary pdf content"),
                }
            );
        };

        using HttpClient client = GetRootedUserClient(Org, App);

        // Run process next
        using HttpResponseMessage processNextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        string responseAsString = await processNextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseAsString);

        processNextResponse.Should().HaveStatusCode(HttpStatusCode.OK);
        sendAsyncCalled.Should().BeTrue();

        // Check that the process has been moved to the next task that is not a service task.
        var processState = JsonConvert.DeserializeObject<ProcessState>(responseAsString);
        processState.Ended.Should().NotBeNull();
    }

    [Fact]
    public async Task CurrentTask_Is_ServiceTask_If_Execute_Fails()
    {
        var sendAsyncCalled = false;

        // Mock HttpClient for the expected pdf service call
        SendAsync = message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");
            sendAsyncCalled = true;

            // Simulate failing PDF service
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        };

        using HttpClient client = GetRootedUserClient(Org, App);

        // Run process next
        using HttpResponseMessage processNextResponse = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next?language={Language}",
            null
        );

        string responseAsString = await processNextResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(responseAsString);

        processNextResponse.Should().HaveStatusCode(HttpStatusCode.InternalServerError);
        sendAsyncCalled.Should().BeTrue();

        responseAsString
            .Should()
            .Be(
                "{\"title\":\"Service task failed!\",\"status\":500,\"detail\":\"Service task pdf failed with an exception!\"}"
            );

        // Double check that process did not move to the next task
        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_2");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be("pdf");
    }
}
