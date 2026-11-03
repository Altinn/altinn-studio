using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Operator.Tests.Commands.OperatorCommand;

/// <summary>
/// Tests <see cref="Operator.Commands.OperatorCommand.OperatorCommand"/>'s validation at enqueue, through the
/// <see cref="ICommand"/> interface the engine calls.
/// </summary>
public class OperatorCommandValidationTests
{
    private static readonly ICommand _command = CreateCommand();

    private static OperatorWorkflowContext ValidContext() =>
        new()
        {
            Domain = "runs",
            Caller = "assistant",
            SubjectId = "4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b",
        };

    private static OperatorCommandData ValidData() => new() { CommandKey = "run.admit" };

    [Fact]
    public void Validate_ValidDataAndContext_Accepts()
    {
        var result = _command.Validate(ValidData(), ValidContext());

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    [Fact]
    public void Validate_WithPayload_Accepts()
    {
        var result = _command.Validate(ValidData() with { Payload = "{\"kind\":\"upgrade-v9\"}" }, ValidContext());

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    [Fact]
    public void Validate_ContextFromJson_Accepts()
    {
        const string json = """{ "domain": "runs", "caller": "assistant", "subjectId": "run-1" }""";
        var context = JsonSerializer.Deserialize<OperatorWorkflowContext>(json, CommandDefinition.SerializerOptions);

        var result = _command.Validate(ValidData(), context);

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    [Fact]
    public void Validate_NullCommandData_Rejects()
    {
        var result = _command.Validate(null, ValidContext());

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("commandKey", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyCommandKey_Rejects(string? commandKey)
    {
        var result = _command.Validate(new OperatorCommandData { CommandKey = commandKey! }, ValidContext());

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("commandKey", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("..")]
    [InlineData(".hidden")]
    [InlineData("run/admit")]
    [InlineData("/run.admit")]
    [InlineData("run.admit?x=1")]
    [InlineData("run admit")]
    public void Validate_CommandKeyOutsideOneSegment_Rejects(string commandKey)
    {
        var result = _command.Validate(new OperatorCommandData { CommandKey = commandKey }, ValidContext());

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("commandKey", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("run.admit")]
    [InlineData("run.await-result")]
    [InlineData("maskinporten.ensure_client")]
    public void Validate_DottedCommandKey_Accepts(string commandKey)
    {
        var result = _command.Validate(new OperatorCommandData { CommandKey = commandKey }, ValidContext());

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    [Fact]
    public void Validate_NullWorkflowContext_Rejects()
    {
        var result = _command.Validate(ValidData(), null);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("workflow context", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyDomain_Rejects(string? domain)
    {
        var result = _command.Validate(ValidData(), ValidContext() with { Domain = domain! });

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("'domain'", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyCaller_Rejects(string? caller)
    {
        var result = _command.Validate(ValidData(), ValidContext() with { Caller = caller! });

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("'caller'", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptySubjectId_Rejects(string? subjectId)
    {
        var result = _command.Validate(ValidData(), ValidContext() with { SubjectId = subjectId! });

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("'subjectId'", invalid.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GetTelemetryAttributes_NamesDomainCallerAndSubject()
    {
        var attributes = _command.GetTelemetryAttributes(ValidData(), ValidContext());

        KeyValuePair<string, object?>[] expected =
        [
            new("altinn.core_operator.domain", "runs"),
            new("altinn.core_operator.caller", "assistant"),
            new("altinn.core_operator.subject_id", "4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b"),
        ];
        Assert.Equal(expected, attributes);
    }

    [Fact]
    public void GetTelemetryAttributes_NoContext_ReturnsNone()
    {
        var attributes = _command.GetTelemetryAttributes(ValidData(), null);

        Assert.Empty(attributes);
    }

    private static Operator.Commands.OperatorCommand.OperatorCommand CreateCommand() =>
        new(
            Options.Create(
                new OperatorCommandSettings { CommandEndpoint = "http://operator.test/callbacks/", TokenPath = "" }
            ),
            new Mock<IHttpClientFactory>().Object,
            new Mock<IConcurrencyLimiter>().Object,
            NullLogger<Operator.Commands.OperatorCommand.OperatorCommand>.Instance
        );
}
