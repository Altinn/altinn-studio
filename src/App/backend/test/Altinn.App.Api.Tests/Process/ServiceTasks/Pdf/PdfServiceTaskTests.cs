using System.Net;
using System.Text;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.Platform.Storage.Interface.Models;
using Argon;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
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
        var maskinportenClientMock = new Mock<IMaskinportenClient>();
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(eFormidlingServiceMock.Object);
            services.RemoveAll<IMaskinportenClient>();
            services.AddSingleton(maskinportenClientMock.Object);
        };

        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task Reject_Is_Blocked_When_PdfServiceTask_Failed_And_Resume_Is_Required()
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

        rejectResponse.Should().HaveStatusCode(HttpStatusCode.Conflict);

        string rejectResponseContent = await rejectResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(rejectResponseContent);
        JObject rejectProblem = JObject.Parse(rejectResponseContent);
        rejectProblem["title"]!.Value<string>().Should().Be("Task must be resumed before it can continue.");
        rejectProblem["status"]!.Value<int>().Should().Be((int)HttpStatusCode.Conflict);
        rejectProblem["processNextState"]!.Value<string>().Should().Be("resumeRequired");

        // Double check that process stays on the failed service task until resume
        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_2");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be(AltinnTaskTypes.Pdf);
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

        JObject problem = JObject.Parse(responseAsString);
        problem["title"]!.Value<string>().Should().Be("Something went wrong while moving to the next task.");
        problem["status"]!.Value<int>().Should().Be((int)HttpStatusCode.InternalServerError);
        // The raw failure detail ("Pdf generation failed" from the step's recorded error) is never
        // serialized to clients - the detail is a stable generic message derived from the failure
        // kind, and the workflowFailure extension is stripped of its recorded error.
        problem["detail"]!
            .Value<string>()
            .Should()
            .Be("A workflow step failed while performing the process action.");
        problem["workflowFailure"]!["kind"]!.Value<string>().Should().Be("stepFailed");
        problem["workflowFailure"]!["retryAction"]!.Value<string>().Should().Be("resumeWorkflow");
        problem["workflowFailure"]!["lastError"].Should().BeNull();
        problem["processStateChanged"]!.Value<bool>().Should().BeTrue();
        problem["processState"]!["currentTask"]!["elementId"]!.Value<string>().Should().Be("Task_2");

        // Double check that process did not move to the next task
        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_2");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be("pdf");
    }
}
