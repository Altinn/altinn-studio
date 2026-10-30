using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

public class WorkflowStatusResponseTests
{
    [Theory]
    [InlineData(null, "Primary")]
    [InlineData(true, "Primary")]
    [InlineData(false, "Auxiliary")]
    public void FromWorkflow_DerivesRoleFromIsHead_AndKeepsTheRawDirective(bool? isHead, string expectedRole)
    {
        var workflow = new Workflow
        {
            OperationId = "op",
            IdempotencyKey = "key",
            Namespace = "ttd:app",
            Steps = [],
            IsHead = isHead,
        };

        var json = JsonSerializer.Serialize(WorkflowStatusResponse.FromWorkflow(workflow));

        using var doc = JsonDocument.Parse(json);
        Assert.Equal(expectedRole, doc.RootElement.GetProperty("role").GetString());
        if (isHead is { } directive)
            Assert.Equal(directive, doc.RootElement.GetProperty("isHead").GetBoolean());
        else
            Assert.False(doc.RootElement.TryGetProperty("isHead", out _));
    }
}
