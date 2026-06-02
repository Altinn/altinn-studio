using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineInstantiationFailureTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task PostSimplified_WhenInitialWorkflowCommandFails_ReturnsResumeProblemDetails()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-instantiation-failure"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readProblem = await instantiationResponse.Read<ProblemDetails>();

        Assert.Equal(HttpStatusCode.InternalServerError, readProblem.Response.StatusCode);

        using JsonDocument document = JsonDocument.Parse(readProblem.Data.Body!);
        JsonElement root = document.RootElement;

        Assert.Equal("Instance initialization failed.", root.GetProperty("title").GetString());
        Assert.Equal(StatusCodes.Status500InternalServerError, root.GetProperty("status").GetInt32());
        Assert.Contains(
            "Do not create a duplicate instance; resolve the workflow failure and call the resume endpoint.",
            root.GetProperty("detail").GetString()
        );
        Assert.Equal("workflowFailed", root.GetProperty("initializationState").GetString());
        Assert.True(root.GetProperty("workflowAccepted").GetBoolean());
        Assert.Equal("resumeCurrentTask", root.GetProperty("recommendedAction").GetString());

        JsonElement workflowFailure = root.GetProperty("workflowFailure");
        Assert.Equal("StepFailed", workflowFailure.GetProperty("kind").GetString());
        Assert.Equal("OnTaskStartingHook", workflowFailure.GetProperty("stepOperationId").GetString());
        Assert.Contains(
            "Scenario task start failed permanently.",
            workflowFailure.GetProperty("lastError").GetProperty("message").GetString()
        );

        string instanceId = root.GetProperty("instanceId").GetString()!;
        int instanceOwnerPartyId = root.GetProperty("instanceOwnerPartyId").GetInt32();
        Guid instanceGuid = root.GetProperty("instanceGuid").GetGuid();
        Assert.Equal($"501337/{instanceGuid}", instanceId);

        JsonElement resumeEndpoint = root.GetProperty("resumeEndpoint");
        Assert.Equal("POST", resumeEndpoint.GetProperty("method").GetString());
        Assert.Equal(
            $"/ttd/{fixture.EffectiveApp}/instances/{instanceOwnerPartyId}/{instanceGuid}/process/resume",
            resumeEndpoint.GetProperty("path").GetString()
        );

        using var getRequest = new HttpRequestMessage(
            HttpMethod.Get,
            $"/ttd/{fixture.EffectiveApp}/instances/{instanceOwnerPartyId}/{instanceGuid}"
        );
        getRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var getResponse = await fixture.GetAppClient().SendAsync(getRequest);
        using var readInstance = await new AppFixture.ApiResponse(fixture, getResponse).Read<Instance>();

        Assert.Equal(HttpStatusCode.OK, readInstance.Response.StatusCode);
        Assert.NotEqual(true, readInstance.Data.Model!.Status?.IsHardDeleted);
        Assert.Equal("Task_1", readInstance.Data.Model.Process.CurrentTask!.ElementId);
    }
}
