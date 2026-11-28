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
public class WorkflowEngineInstantiationDataCreationFailureTests(
    ITestOutputHelper output,
    AppFixtureClassFixture classFixture
) : IClassFixture<AppFixtureClassFixture>
{
    [Fact]
    public async Task PostSimplified_WhenDataCreationThrows_FailsWithoutRetrying()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-instantiation-data-creation-failure"
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

        Assert.Equal(HttpStatusCode.InternalServerError, readProblem.Response.StatusCode);

        // The wait gives up after 100 seconds, so an answer well inside that came from a step that failed for good.
        Assert.True(stopwatch.Elapsed < TimeSpan.FromSeconds(30), $"Instantiation answered after {stopwatch.Elapsed}");

        using JsonDocument document = JsonDocument.Parse(readProblem.Data.Body!);
        JsonElement root = document.RootElement;

        Assert.Equal("workflowFailed", root.GetProperty("initializationState").GetString());
        Assert.Equal("resumeCurrentTask", root.GetProperty("recommendedAction").GetString());

        JsonElement workflowFailure = root.GetProperty("workflowFailure");
        Assert.Equal("stepFailed", workflowFailure.GetProperty("kind").GetString());
        Assert.Equal("CommonTaskInitialization", workflowFailure.GetProperty("stepOperationId").GetString());

        JsonElement lastError = workflowFailure.GetProperty("lastError");
        Assert.False(lastError.GetProperty("wasRetryable").GetBoolean());
        Assert.Contains(
            "IInstantiationProcessor.DataCreation failed for data type",
            lastError.GetProperty("message").GetString()
        );
        Assert.Contains("Scenario data creation threw.", lastError.GetProperty("message").GetString());
    }
}
