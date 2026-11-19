using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Resilience;
using static WorkflowEngine.Operator.Tests.Fixtures.OperatorCommandTestFixture;

namespace WorkflowEngine.Operator.Tests.Commands.OperatorCommand;

public sealed class OperatorCommandValidationTests
{
    private static readonly ICommand _command = CreateCommand();

    [Fact]
    public void Validate_NullCommandData_Rejects()
    {
        var result = _command.Validate(null, DefaultContext);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("commandKey", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyCommandKey_Rejects(string? commandKey)
    {
        var result = _command.Validate(new OperatorCommandData { CommandKey = commandKey! }, DefaultContext);

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
    [InlineData("run.admit\n")]
    public void Validate_CommandKeyOutsideOneSegment_Rejects(string commandKey)
    {
        var result = _command.Validate(new OperatorCommandData { CommandKey = commandKey }, DefaultContext);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("commandKey", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("run.admit")]
    [InlineData("run.await-result")]
    [InlineData("maskinporten.ensure_client")]
    public void Validate_DottedCommandKey_Accepts(string commandKey)
    {
        var result = _command.Validate(new OperatorCommandData { CommandKey = commandKey }, DefaultContext);

        Assert.IsType<CommandValidationResult.Valid>(result);
    }

    [Fact]
    public void Validate_NullWorkflowContext_Rejects()
    {
        var result = _command.Validate(CreateCommandData(), null);

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("workflow context", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyDomain_Rejects(string? domain)
    {
        var result = _command.Validate(CreateCommandData(), DefaultContext with { Domain = domain! });

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("'domain'", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyCaller_Rejects(string? caller)
    {
        var result = _command.Validate(CreateCommandData(), DefaultContext with { Caller = caller! });

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("'caller'", invalid.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptySubjectId_Rejects(string? subjectId)
    {
        var result = _command.Validate(CreateCommandData(), DefaultContext with { SubjectId = subjectId! });

        var invalid = Assert.IsType<CommandValidationResult.Invalid>(result);
        Assert.Contains("'subjectId'", invalid.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void GetTelemetryAttributes_NamesDomainCallerAndSubject()
    {
        var attributes = _command.GetTelemetryAttributes(CreateCommandData(), DefaultContext);

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
        var attributes = _command.GetTelemetryAttributes(CreateCommandData(), null);

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
