using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

/// <summary>
/// A PDF service task between a task with confirm/reject actions and an exclusive gateway that routes on
/// <c>gatewayAction</c> — the shape the v8 to v9 upgrade produces by inserting the PDF task after the task it
/// documents. The PDF task forwards the user's action, so the gateway routes on it; on reject it renders
/// nothing and ends as abandoned, as v8 made no PDF for an abandoned task.
/// </summary>
[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineGatewayAfterPdfTaskTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const string Scenario = "workflow-engine-gateway-after-pdf-task";
    private const string PdfTaskId = "PdfTask_Task_1";
    private const string PdfDataType = "ref-data-as-pdf";

    // Keep in sync with PdfRenderLogger.RenderLogMessage in the scenario's services.
    private const string RenderLogMessage = "PdfGeneratorClient.GeneratePdf";

    // Keep in sync with StudioctlEnvironment.WaitForEngineReady - the engine's host-exposed address.
    private static readonly Uri _engineBaseAddress = new("http://workflow-engine.local.altinn.cloud:8000");

    [Fact]
    public async Task Confirm_RendersThePdfOnce_AndTheGatewayRoutesToTheNextTask()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstanceWithValidData(fixture, token);

        using var processNextResponse = await fixture.Instances.ProcessNext(
            token,
            instance,
            new ProcessNext { Action = "confirm" }
        );
        using var processState = await processNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Equal("Task_2", Model(processState).CurrentTask?.ElementId);

        Instance refreshed = await GetInstance(fixture, token, instance);
        Assert.Single(refreshed.Data, data => data.DataType == PdfDataType);
        Assert.Equal(1, CountRenders(await fixture.GetSnapshotAppLogs()));

        // The transition out of the PDF task ends it, as the user's confirm ended the task before it.
        List<string> leavingSteps = await GetStepOperationIds(refreshed, $"{PdfTaskId} -> Task_2");
        Assert.Contains("EndTask", leavingSteps);
        Assert.DoesNotContain("AbandonTask", leavingSteps);
    }

    [Fact]
    public async Task Reject_SkipsThePdf_AbandonsThePdfTask_AndTheGatewayRoutesToTheRejectedEnd()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, scenario: Scenario);
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: 1337);
        using var instance = await CreateInstanceWithValidData(fixture, token);

        using var processNextResponse = await fixture.Instances.ProcessNext(
            token,
            instance,
            new ProcessNext { Action = "reject" }
        );
        using var processState = await processNextResponse.Read<AppProcessState>();

        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        AppProcessState state = Model(processState);
        Assert.Null(state.CurrentTask);
        Assert.Equal("EndEvent_Rejected", state.EndEvent);

        Instance refreshed = await GetInstance(fixture, token, instance);
        Assert.DoesNotContain(refreshed.Data, data => data.DataType == PdfDataType);
        Assert.Equal(0, CountRenders(await fixture.GetSnapshotAppLogs()));

        // The transition out of the PDF task abandons it, as the user's reject abandoned the task before it.
        List<string> leavingSteps = await GetStepOperationIds(refreshed, $"{PdfTaskId} -> EndEvent_Rejected");
        Assert.Contains("AbandonTask", leavingSteps);
        Assert.DoesNotContain("EndTask", leavingSteps);
    }

    private static T Model<T>(AppFixture.ReadApiResponse<T> response) =>
        response.Data.Model
        ?? throw new InvalidOperationException(
            $"Expected a {typeof(T).Name} in the response, got: {response.Data.Body}"
        );

    private static int CountRenders(string logs) =>
        logs.Split('\n').Count(line => line.Contains(RenderLogMessage, StringComparison.Ordinal));

    private static async Task<AppFixture.ReadApiResponse<Instance>> CreateInstanceWithValidData(
        AppFixture fixture,
        string token
    )
    {
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var readInstantiation = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, readInstantiation.Response.StatusCode);

        Guid dataElementId = Guid.Parse(Model(readInstantiation).Data.Single(d => d.DataType == "model").Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            readInstantiation,
            new DataPatchRequestMultiple
            {
                Patches =
                [
                    new(
                        dataElementId,
                        new JsonPatch(
                            PatchOperation.Replace(JsonPointer.Create("property1"), JsonNode.Parse("\"2\"")),
                            PatchOperation.Replace(JsonPointer.Create("property2"), JsonNode.Parse("\"2\""))
                        )
                    ),
                ],
                IgnoredValidators = null,
            }
        );
        using var readPatchResponse = await patchResponse.Read<DataPatchResponseMultiple>();
        Assert.Equal(HttpStatusCode.OK, readPatchResponse.Response.StatusCode);

        return readInstantiation;
    }

    private static async Task<Instance> GetInstance(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.Get(token, instance);
        using var read = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, read.Response.StatusCode);
        return Model(read);
    }

    /// <summary>
    /// The step operation ids of the instance's process-next workflow for <paramref name="transition"/>, read
    /// from the workflow engine. A task-end step is named after its command, so the steps say whether the
    /// transition ended or abandoned the task it left.
    /// </summary>
    private static async Task<List<string>> GetStepOperationIds(Instance instance, string transition)
    {
        using var engineClient = new HttpClient { BaseAddress = _engineBaseAddress };
        string ns = Uri.EscapeDataString(instance.AppId);
        string collectionKey = instance.Id.Split('/')[1];
        using var response = await engineClient.GetAsync(
            $"/api/v1/{ns}/workflows?collectionKey={Uri.EscapeDataString(collectionKey)}&pageSize=100"
        );
        response.EnsureSuccessStatusCode();

        EnginePage page =
            JsonSerializer.Deserialize<EnginePage>(await response.Content.ReadAsStringAsync())
            ?? throw new InvalidOperationException("The workflow engine returned no workflow page.");
        EngineWorkflow workflow = Assert.Single(page.Data, w => w.OperationId == $"Process next: {transition}");
        return workflow.Steps.Select(step => step.OperationId).ToList();
    }

    private sealed record EnginePage([property: JsonPropertyName("data")] List<EngineWorkflow> Data);

    private sealed record EngineWorkflow(
        [property: JsonPropertyName("operationId")] string OperationId,
        [property: JsonPropertyName("steps")] List<EngineStep> Steps
    );

    private sealed record EngineStep([property: JsonPropertyName("operationId")] string OperationId);
}
