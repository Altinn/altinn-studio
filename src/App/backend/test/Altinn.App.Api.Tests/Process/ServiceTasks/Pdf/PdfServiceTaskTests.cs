using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
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
        // This app's process runs the eFormidling task after the PDF one, and that task now waits for
        // a delivery confirmation before the process moves on. Report the shipment as delivered so
        // these tests keep exercising the PDF task rather than parking on the wait behind it.
        eFormidlingServiceMock
            .Setup(x =>
                x.GetEFormidlingShipmentStatus(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<ValidAltinnEFormidlingConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new EFormidlingShipmentStatus { State = EFormidlingDeliveryState.Delivered, Status = "levert" }
            );

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

    [Theory]
    [InlineData("language", "en")]
    [InlineData("lang", "en")]
    [InlineData(null, "nn")]
    public async Task PdfServiceTask_RendersThePdfInTheLanguageTheUserChose_OrTheirProfileLanguage(
        string? queryName,
        string expected
    )
    {
        // The PDF is rendered in a workflow-engine callback, a request of its own without the user's query string or
        // authentication. Its language comes from the one process/next was called with, under either name that worked
        // when PDFs were rendered inside process/next.
        List<string> pdfLanguages = [];
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be($"/pdf");
            using System.Text.Json.JsonDocument body = System.Text.Json.JsonDocument.Parse(
                await message.Content!.ReadAsStringAsync()
            );
            string url = body.RootElement.GetProperty("url").GetString()!;
            pdfLanguages.Add(Regex.Match(url, "[?&]lang=([^&#]*)").Groups[1].Value);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };
        using HttpClient client = GetRootedUserClient(Org, App);
        string query = queryName is null ? "" : $"?{queryName}=en";

        using HttpResponseMessage response = await client.PutAsync(
            $"{Org}/{App}/instances/{_instanceId}/process/next{query}",
            null
        );

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        // User 1337's profile language is nn.
        Assert.Equal(expected, Assert.Single(pdfLanguages));
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
        problem["detail"]!.Value<string>().Should().Be("A workflow step failed while performing the process action.");
        problem["workflowFailure"]!["kind"]!.Value<string>().Should().Be("stepFailed");
        problem["workflowFailure"]!["retryAction"]!.Value<string>().Should().Be("resumeWorkflow");
        problem["workflowFailure"]!["lastError"].Should().BeNull();
        problem["processStateChanged"]!.Value<bool>().Should().BeTrue();
        problem["processState"]!["currentTask"]!["elementId"]!.Value<string>().Should().Be("Task_2");

        // The target service task was committed with processing ownership before execution failed.
        Instance instance = await TestData.GetInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
        instance.Process.CurrentTask.ElementId.Should().Be("Task_2");
        instance.Process.CurrentTask.AltinnTaskType.Should().Be("pdf");
    }
}
