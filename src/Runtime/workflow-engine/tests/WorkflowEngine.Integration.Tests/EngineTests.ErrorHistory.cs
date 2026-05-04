using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    /// <summary>
    /// Regression test for <see href="https://github.com/Altinn/altinn-studio/issues/18556">#18556</see>.
    /// Drives a step through multiple retryable failures so the workflow round-trips through the DB
    /// each retry cycle, then asserts the <c>ErrorHistory</c> entries exposed via the status API
    /// still carry populated fields. The prior bug silently wrote every entry as defaults on re-read
    /// due to a PascalCase/camelCase mismatch between the EF jsonb converter and the direct-SQL
    /// UPDATE path.
    /// </summary>
    [Fact]
    public async Task ErrorHistory_SurvivesMultiRetryDbRoundTrip_WithPopulatedFields()
    {
        // Arrange — WireMock returns 500 three times, then 200
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("error-history-roundtrip")
            .WillSetStateTo("failed-1")
            .RespondWith(Response.Create().WithStatusCode(500).WithBody("boom-1"));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("error-history-roundtrip")
            .WhenStateIs("failed-1")
            .WillSetStateTo("failed-2")
            .RespondWith(Response.Create().WithStatusCode(500).WithBody("boom-2"));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("error-history-roundtrip")
            .WhenStateIs("failed-2")
            .WillSetStateTo("succeeded")
            .RespondWith(Response.Create().WithStatusCode(500).WithBody("boom-3"));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("error-history-roundtrip")
            .WhenStateIs("succeeded")
            .RespondWith(Response.Create().WithStatusCode(200));

        var step = _testHelpers.CreateWebhookStep(
            "/error-history-target",
            retryStrategy: RetryStrategy.Constant(TimeSpan.FromMilliseconds(100), maxRetries: 5)
        );
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        // Act — wait for completion (3 failed attempts, then success) and inspect the status payload
        var completed = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            timeout: TimeSpan.FromSeconds(30)
        );

        // Assert — 3 entries, each with real data; none defaulted. Explicit assertions defend against
        // the regression pattern (defaulted fields) independently of any future snapshot edits.
        var entries = completed.Steps.Single().ErrorHistory;
        Assert.NotNull(entries);
        Assert.Equal(3, entries.Count);

        Assert.All(
            entries,
            entry =>
            {
                Assert.False(string.IsNullOrWhiteSpace(entry.Message), "Message must not be null or whitespace");
                Assert.True(entry.Timestamp > DateTimeOffset.MinValue, "Timestamp must not be the default value");
                Assert.Equal(500, entry.HttpStatusCode);
                Assert.True(entry.WasRetryable);
            }
        );

        // Snapshot — documents the exact response shape, including how the WireMock body ("boom-N") gets
        // embedded into the ErrorEntry message. No sibling test exercises a non-empty upstream body.
        using var response = await _client.GetWorkflowRaw(workflowId);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }
}
