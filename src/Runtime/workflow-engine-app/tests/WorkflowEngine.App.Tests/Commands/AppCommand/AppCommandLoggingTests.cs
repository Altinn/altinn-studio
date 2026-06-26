using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;

namespace WorkflowEngine.App.Tests.Commands.AppCommand;

/// <summary>
/// Security regression guard: <see cref="App.Commands.AppCommand.AppCommand"/> must never log the
/// callback payload. The payload carries actor identifiers (incl. national identity number), the lock
/// token, the command payload body, and the unencrypted state envelope (instance + form data). Logging
/// would leak PII and secrets into workflow-engine logs.
/// </summary>
public class AppCommandLoggingTests
{
    private const string SecretNationalIdentityNumber = "01017012345";
    private const string SecretLockToken = "SENSITIVE_LOCK_TOKEN";
    private const string SecretPayloadBody = "SENSITIVE_PAYLOAD_BODY";
    private const string SecretStateBlob = "SENSITIVE_STATE_BLOB";

    [Fact]
    public async Task Execute_DoesNotLogSensitivePayloadFields()
    {
        var logCollector = new CapturingLoggerProvider();
        using var fixture = AppCommandTestFixture.Create(services =>
            services.AddSingleton<ILoggerProvider>(logCollector)
        );
        var command = fixture.GetAppCommand();

        var context = new AppWorkflowContext
        {
            Actor = new Actor
            {
                UserId = 1337,
                OrgId = "ttd",
                NationalIdentityNumber = SecretNationalIdentityNumber,
                SystemUserId = Guid.Parse("11111111-2222-3333-4444-555555555555"),
            },
            LockToken = SecretLockToken,
            Org = "ttd",
            App = "test-app",
            InstanceOwnerPartyId = 12345,
            InstanceGuid = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            CallbackToken = "test-callback-token",
        };

        var data = new AppCommandData { CommandKey = "test-command", Payload = SecretPayloadBody };
        var step = AppCommandTestFixture.CreateStep(App.Commands.AppCommand.AppCommand.Create(data));
        var workflow = AppCommandTestFixture.CreateWorkflow(step);
        var execContext = AppCommandTestFixture.CreateExecutionContext(
            workflow,
            step,
            data,
            workflowContext: context,
            stateIn: SecretStateBlob
        );

        var result = await command.Execute(execContext, TestContext.Current.CancellationToken);

        Assert.Equal(ExecutionStatus.Success, result.Status);

        var logs = string.Join("\n", logCollector.Messages);

        // Negative: no sensitive field may appear in any log line.
        Assert.DoesNotContain(SecretNationalIdentityNumber, logs, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretLockToken, logs, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretPayloadBody, logs, StringComparison.Ordinal);
        Assert.DoesNotContain(SecretStateBlob, logs, StringComparison.Ordinal);

        // Positive: non-sensitive routing fields are logged so the call is still traceable.
        Assert.Contains("test-command", logs, StringComparison.Ordinal);
        Assert.Contains(workflow.DatabaseId.ToString(), logs, StringComparison.Ordinal);
        Assert.Contains(context.InstanceGuid.ToString(), logs, StringComparison.Ordinal);
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public ConcurrentQueue<string> Messages { get; } = new();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(Messages);

        public void Dispose() { }

        private sealed class CapturingLogger(ConcurrentQueue<string> messages) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state)
                where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception? exception,
                Func<TState, Exception?, string> formatter
            ) => messages.Enqueue(formatter(state, exception));
        }
    }
}
