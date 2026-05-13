using WorkflowEngine.Data.Conventions;

namespace WorkflowEngine.Data.Tests.Conventions;

public class SnakeCaseNamingConventionTests
{
    [Theory]
    [InlineData("Workflows", "workflows")]
    [InlineData("Steps", "steps")]
    [InlineData("Id", "id")]
    [InlineData("WorkflowId", "workflow_id")]
    [InlineData("OperationId", "operation_id")]
    [InlineData("IdempotencyKey", "idempotency_key")]
    [InlineData("BackoffUntil", "backoff_until")]
    [InlineData("CancellationRequestedAt", "cancellation_requested_at")]
    [InlineData("DependsOnWorkflowId", "depends_on_workflow_id")]
    [InlineData("WorkflowDependency", "workflow_dependency")]
    [InlineData("DistributedTraceContext", "distributed_trace_context")]
    public void ToSnakeCase_PascalCase_SplitsAtCamelBoundaries(string input, string expected)
    {
        Assert.Equal(expected, SnakeCaseNamingConvention.ToSnakeCase(input));
    }

    [Theory]
    [InlineData("JSONOptions", "json_options")]
    [InlineData("HTTPSConnection", "https_connection")]
    [InlineData("OperationID", "operation_id")]
    [InlineData("URLParser", "url_parser")]
    [InlineData("XMLHttpRequest", "xml_http_request")]
    public void ToSnakeCase_Acronyms_SplitOnAcronymBoundary(string input, string expected)
    {
        Assert.Equal(expected, SnakeCaseNamingConvention.ToSnakeCase(input));
    }

    [Theory]
    [InlineData("workflow_id", "workflow_id")]
    [InlineData("idempotency_key", "idempotency_key")]
    [InlineData("ix_workflows_status", "ix_workflows_status")]
    [InlineData("pk_workflows", "pk_workflows")]
    public void ToSnakeCase_AlreadySnakeCase_IsIdempotent(string input, string expected)
    {
        Assert.Equal(expected, SnakeCaseNamingConvention.ToSnakeCase(input));
    }

    [Theory]
    [InlineData("IX_Workflows_Status", "ix_workflows_status")]
    [InlineData("PK_Workflows", "pk_workflows")]
    [InlineData("FK_Steps_Workflows_JobId", "fk_steps_workflows_job_id")]
    public void ToSnakeCase_NamesWithUnderscores_PreserveStructure(string input, string expected)
    {
        Assert.Equal(expected, SnakeCaseNamingConvention.ToSnakeCase(input));
    }

    [Theory]
    [InlineData("Step1", "step1")]
    [InlineData("Step1Result", "step1_result")]
    [InlineData("V2Schema", "v2_schema")]
    [InlineData("Base64Encoded", "base64_encoded")]
    public void ToSnakeCase_NamesWithDigits_SplitOnLetterBoundary(string input, string expected)
    {
        Assert.Equal(expected, SnakeCaseNamingConvention.ToSnakeCase(input));
    }

    [Theory]
    [InlineData("a", "a")]
    [InlineData("A", "a")]
    [InlineData("URL", "url")]
    [InlineData("ID", "id")]
    [InlineData("", "")]
    public void ToSnakeCase_EdgeCases_HandledCleanly(string input, string expected)
    {
        Assert.Equal(expected, SnakeCaseNamingConvention.ToSnakeCase(input));
    }
}
