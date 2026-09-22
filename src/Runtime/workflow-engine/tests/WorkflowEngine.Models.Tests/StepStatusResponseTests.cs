using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

/// <summary>
/// The engine's own <see cref="StepStatusResponse"/> is also a client-side type (the TestKit reads with
/// it), so both ends of the documented per-step duration recipe — <c>updatedAt − executionStartedAt</c> —
/// must survive a JSON round trip. An internal setter would leave one of them silently null.
/// </summary>
public class StepStatusResponseTests
{
    private static readonly DateTimeOffset _startedAt = new(2026, 3, 19, 10, 0, 1, TimeSpan.Zero);
    private static readonly DateTimeOffset _updatedAt = new(2026, 3, 19, 10, 0, 2, TimeSpan.Zero);

    [Fact]
    public void Deserialize_PopulatesUpdatedAtAndExecutionStartedAt()
    {
        const string json = """
            {
              "databaseId": "c1d2e3f4-a5b6-7890-cdef-123456789abc",
              "operationId": "validate-form",
              "processingOrder": 0,
              "updatedAt": "2026-03-19T10:00:02+00:00",
              "executionStartedAt": "2026-03-19T10:00:01+00:00",
              "command": { "type": "app" },
              "status": "Completed",
              "retryCount": 0
            }
            """;

        var step = JsonSerializer.Deserialize<StepStatusResponse>(json);

        Assert.NotNull(step);
        Assert.Equal(_updatedAt, step.UpdatedAt);
        Assert.Equal(_startedAt, step.ExecutionStartedAt);
        Assert.Equal(TimeSpan.FromSeconds(1), step.UpdatedAt - step.ExecutionStartedAt);
    }

    [Fact]
    public void Serialize_RoundTripsExecutionStartedAt_AndOmitsItWhenNull()
    {
        var step = new Step
        {
            OperationId = "validate-form",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("app"),
        };

        var unstarted = JsonSerializer.Serialize(StepStatusResponse.FromStep(step));
        Assert.DoesNotContain("executionStartedAt", unstarted, StringComparison.Ordinal);

        step.ExecutionStartedAt = _startedAt;
        var started = JsonSerializer.Deserialize<StepStatusResponse>(
            JsonSerializer.Serialize(StepStatusResponse.FromStep(step))
        );

        Assert.NotNull(started);
        Assert.Equal(_startedAt, started.ExecutionStartedAt);
    }
}
