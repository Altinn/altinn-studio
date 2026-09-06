using System.Net;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// End-to-end tests for the PDF preview endpoints against the "ttd/service-tasks" test app, which has a
/// PDF service task ("Task_2", configured with <c>autoPdfTaskIds</c> for "Task_1") later in its process
/// than the instance's current task.
/// </summary>
public class PdfPreviewApiTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "service-tasks";
    private const int InstanceOwnerPartyId = 501337; // Sofie Salt

    // A distinct instance id from PdfServiceTaskTests' — both classes prepare/tear down instance data on
    // disk for the "ttd/service-tasks" app, and xUnit runs test classes in parallel by default, so sharing
    // an instance id here would race with that class's process/next calls.
    private static readonly Guid _instanceGuid = new("c2af1cfd-db99-45f9-9625-9dfa1223485f");
    private static readonly string _instanceId = $"{InstanceOwnerPartyId}/{_instanceGuid}";

    public PdfPreviewApiTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    [Fact]
    public async Task GetPdfPreview_ForPdfServiceTaskLaterInProcess_GeneratesFromThatTaskWithAutoPdfTaskIds()
    {
        string? requestBody = null;
        SendAsync = async message =>
        {
            message.RequestUri!.PathAndQuery.Should().Be("/pdf");
            requestBody = message.Content is null ? null : await message.Content.ReadAsStringAsync();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("this is the binary pdf content"),
            };
        };

        using HttpClient client = GetRootedUserClient(Org, App);

        using HttpResponseMessage response = await client.GetAsync(
            $"{Org}/{App}/instances/{_instanceId}/pdf/preview?taskId=Task_2&language=nb"
        );

        response.Should().HaveStatusCode(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/pdf");

        requestBody.Should().NotBeNull();
        requestBody!
            .Should()
            .Contain($"/instance/{InstanceOwnerPartyId}/{_instanceGuid}/Task_2?pdf=1")
            .And.Contain("task=Task_1");
    }

    [Fact]
    public async Task GetPdfPreviewTasks_ListsThePdfServiceTask()
    {
        using HttpClient client = GetRootedUserClient(Org, App);

        using HttpResponseMessage response = await client.GetAsync(
            $"{Org}/{App}/instances/{_instanceId}/pdf/preview/tasks"
        );

        string content = await response.Content.ReadAsStringAsync();
        response.Should().HaveStatusCode(HttpStatusCode.OK);

        var result = JsonSerializer.Deserialize<PdfPreviewTasksResponse>(content, JsonSerializerOptions);
        result.Should().NotBeNull();

        var pdfTask = result!.Tasks.Should().ContainSingle(t => t.TaskId == "Task_2").Subject;
        pdfTask.TaskType.Should().Be("pdf");
        pdfTask.AutoPdfTaskIds.Should().BeEquivalentTo(["Task_1"]);
    }
}
