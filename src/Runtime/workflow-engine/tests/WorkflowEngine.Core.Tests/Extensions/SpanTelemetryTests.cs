using System.Diagnostics;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Tests.Extensions;

/// <summary>
/// Tests the span helpers every engine span goes through: how a failure is recorded, and how a stored trace
/// context becomes a link.
/// </summary>
public sealed class SpanTelemetryTests
{
    private const string Traceparent = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01";

    [Fact]
    public void Errored_WithAnException_SetsTheErrorStatusAndTypeAndRecordsNoEvent()
    {
        // Arrange
        using var activity = new Activity("test");
        var exception = new InvalidOperationException("broken");

        // Act
        activity.Errored(exception);

        // Assert
        Assert.Equal(ActivityStatusCode.Error, activity.Status);
        Assert.Equal("broken", activity.StatusDescription);
        Assert.Equal("System.InvalidOperationException", activity.GetTagItem("error.type"));
        Assert.Empty(activity.Events);
    }

    [Fact]
    public void Errored_WithAnErrorType_SetsTheErrorStatusAndThatType()
    {
        // Arrange
        using var activity = new Activity("test");

        // Act
        activity.Errored(errorType: "lease_lost", errorMessage: "Lease lost");

        // Assert
        Assert.Equal(ActivityStatusCode.Error, activity.Status);
        Assert.Equal("Lease lost", activity.StatusDescription);
        Assert.Equal("lease_lost", activity.GetTagItem("error.type"));
        Assert.Empty(activity.Events);
    }

    [Fact]
    public void Succeeded_AfterErrored_ClearsTheErrorType()
    {
        // Arrange
        using var activity = new Activity("test");
        activity.Errored(errorType: TelemetryExtensions.OtherErrorType);

        // Act
        activity.Succeeded();

        // Assert
        Assert.Equal(ActivityStatusCode.Ok, activity.Status);
        Assert.Null(activity.GetTagItem("error.type"));
    }

    [Fact]
    public void OtherErrorType_IsTheSemanticConventionsFallback()
    {
        Assert.Equal("_OTHER", TelemetryExtensions.OtherErrorType);
    }

    [Fact]
    public void ParseTraceContext_ValidTraceparent_ReturnsItsContext()
    {
        // Act
        var context = Metrics.ParseTraceContext(Traceparent);

        // Assert
        Assert.NotNull(context);
        Assert.Equal("0af7651916cd43dd8448eb211c80319c", context.Value.TraceId.ToHexString());
        Assert.Equal("b7ad6b7169203331", context.Value.SpanId.ToHexString());
    }

    [Fact]
    public void ParseTraceContext_Null_ReturnsNull()
    {
        Assert.Null(Metrics.ParseTraceContext(null));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-traceparent")]
    [InlineData("00-0af7651916cd43dd8448eb211c80319c-b7ad6b71692033-01")]
    [InlineData("00-zzzz651916cd43dd8448eb211c80319c-b7ad6b7169203331-01")]
    public void ParseTraceContext_Malformed_ReturnsNull(string traceContext)
    {
        Assert.Null(Metrics.ParseTraceContext(traceContext));
    }

    [Fact]
    public void ToActivityLinks_MalformedTraceContext_YieldsNoLink()
    {
        // Act
        var links = new[] { Traceparent, "not-a-traceparent", null }
            .Select(Metrics.ParseTraceContext)
            .ToActivityLinks()
            .ToList();

        // Assert — no link to the all-zero trace stands in for the one that did not parse
        var link = Assert.Single(links);
        Assert.Equal("0af7651916cd43dd8448eb211c80319c", link.Context.TraceId.ToHexString());
    }
}
