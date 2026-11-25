using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineInstantiationRetriedFailureTests(
    ITestOutputHelper output,
    AppFixtureClassFixture classFixture
) : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task PostSimplified_WhenAStepKeepsFailing_FailsWithinTheRequest()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-instantiation-retried-failure"
        );
        var fixture = fixtureScope.Fixture;

        string token = await fixture.Auth.GetUserToken(userId: 1337);

        var stopwatch = Stopwatch.StartNew();
        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        stopwatch.Stop();
        using var readProblem = await instantiationResponse.Read<ProblemDetails>();

        // A wait that gave up would answer 504 after 100 seconds, with the workflow still retrying.
        Assert.Equal(HttpStatusCode.InternalServerError, readProblem.Response.StatusCode);
        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(90), $"Instantiation answered after {stopwatch.Elapsed}");

        using JsonDocument document = JsonDocument.Parse(readProblem.Data.Body!);
        JsonElement root = document.RootElement;

        Assert.Equal("workflowFailed", root.GetProperty("initializationState").GetString());
        Assert.Equal("resumeCurrentTask", root.GetProperty("recommendedAction").GetString());

        JsonElement workflowFailure = root.GetProperty("workflowFailure");
        Assert.Equal("stepFailed", workflowFailure.GetProperty("kind").GetString());
        Assert.Equal("OnTaskStartingHook", workflowFailure.GetProperty("stepOperationId").GetString());
        Assert.True(workflowFailure.GetProperty("retryCount").GetInt32() > 0);
        Assert.Contains(
            "Scenario task start keeps failing.",
            workflowFailure.GetProperty("lastError").GetProperty("message").GetString()
        );
    }
}
