using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineConfigurationTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task ProcessNext_DuplicateTaskEndingHooks_ReturnsStructuredNonRetryableWorkflowFailure()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-duplicate-task-ending-hooks"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using AppFixture.ReadApiResponse<Instance> instance = await CreateInstance(fixture, token);
        await PatchValidFormData(fixture, token, instance);

        using var processNextResponse = await fixture.Instances.ProcessNext(token, instance);
        using var processNext = await processNextResponse.Read<ProblemDetails>();

        Assert.Equal(HttpStatusCode.InternalServerError, processNext.Response.StatusCode);

        using JsonDocument document = JsonDocument.Parse(processNext.Data.Body!);
        JsonElement workflowFailure = document.RootElement.GetProperty("workflowFailure");
        Assert.Equal("stepFailed", workflowFailure.GetProperty("kind").GetString());
        Assert.Equal("OnTaskEndingHook", workflowFailure.GetProperty("stepOperationId").GetString());

        JsonElement lastError = workflowFailure.GetProperty("lastError");
        Assert.False(lastError.GetProperty("wasRetryable").GetBoolean());
        Assert.Contains(
            "Multiple IOnTaskEndingHandler hooks are registered",
            lastError.GetProperty("message").GetString()
        );

        using var refreshedInstanceResponse = await fixture.Instances.Get(token, instance);
        using var refreshedInstance = await refreshedInstanceResponse.Read<Instance>();
        Assert.Equal("Task_1", refreshedInstance.Data.Model!.Process.CurrentTask!.ElementId);

        using var blockedProcessNextResponse = await fixture.Instances.ProcessNext(token, refreshedInstance);
        using var blockedProcessNext = await blockedProcessNextResponse.Read<ProblemDetails>();
        Assert.Equal(HttpStatusCode.Conflict, blockedProcessNext.Response.StatusCode);

        using JsonDocument blockedDocument = JsonDocument.Parse(blockedProcessNext.Data.Body!);
        Assert.Equal("resumeRequired", blockedDocument.RootElement.GetProperty("processNextState").GetString());
    }

    private static async Task<AppFixture.ReadApiResponse<Instance>> CreateInstance(AppFixture fixture, string token)
    {
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, readInstantiationResponse.Response.StatusCode);
        Assert.Equal("Task_1", readInstantiationResponse.Data.Model!.Process.CurrentTask!.ElementId);
        return readInstantiationResponse;
    }

    private static async Task PatchValidFormData(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        Guid dataElementId = Guid.Parse(instance.Data.Model!.Data.Single(d => d.DataType == "model").Id);
        using var patchResponse = await fixture.Instances.PatchFormData(
            token,
            instance,
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
    }
}
