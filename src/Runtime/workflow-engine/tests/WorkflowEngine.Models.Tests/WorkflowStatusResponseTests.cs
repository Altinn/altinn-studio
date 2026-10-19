using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

public class WorkflowStatusResponseTests
{
    [Theory]
    [InlineData(null, "primary")]
    [InlineData(true, "primary")]
    [InlineData(false, "auxiliary")]
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

    [Theory]
    [InlineData("\"primary\"", WorkflowRole.Primary)]
    [InlineData("\"auxiliary\"", WorkflowRole.Auxiliary)]
    public void Role_RoundTripsByItsWireName(string json, WorkflowRole expected)
    {
        Assert.Equal(expected, JsonSerializer.Deserialize<WorkflowRole>(json));
        Assert.Equal(json, JsonSerializer.Serialize(expected));
    }
}
