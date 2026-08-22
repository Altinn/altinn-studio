using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WorkflowEngine.Core.Tests.Fixtures;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Abstractions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// What the executor does with a receive workflow: which steps it reads the rendezvous for, and what it
/// hands or refuses to hand the command.
/// </summary>
public class WorkflowExecutorMailboxTests
{
    private static readonly Guid _mailboxId = Guid.Parse("018f4e00-0000-7000-8000-00000000ffff");

    /// <summary>A command that records the receipt it was handed on every execution, in order.</summary>
    private sealed class ReceiptCapturingCommand : ICommand
    {
        public string CommandType => "receipt-capture";
        public Type? CommandDataType => null;
        public Type? WorkflowContextType => null;

        public List<MailboxReceipt?> Captured { get; } = [];

        public CommandValidationResult Validate(object? commandData, object? workflowContext) =>
            new CommandValidationResult.Valid();

        public Task<ExecutionResult> Execute(CommandExecutionContext context, CancellationToken cancellationToken)
        {
            Captured.Add(context.MailboxReceipt);
            return Task.FromResult(ExecutionResult.Success());
        }
    }

    private static Step CreateStep(int order) =>
        new()
        {
            OperationId = $"step-{order}",
            ProcessingOrder = order,
            Command = CommandDefinition.Create("receipt-capture"),
        };

    private static Workflow CreateWorkflow(Guid? mailboxId, params Step[] steps)
    {
        var workflow = new Workflow
        {
            OperationId = "receive",
            IdempotencyKey = "receiver",
            Namespace = "test-namespace",
            MailboxId = mailboxId,
            Steps = [.. steps],
        };
        workflow.DatabaseId = Guid.CreateVersion7();
        return workflow;
    }

    private static MailboxReceipt Delivered =>
        MailboxReceipt.Delivered(
            _mailboxId,
            seq: 3,
            new MailboxDelivery
            {
                IdempotencyKey = "source-msg-4",
                Payload = """{"status":"confirmed"}""",
                AcceptedAt = DateTimeOffset.UnixEpoch,
            }
        );

    [Fact]
    public async Task Execute_OfAnOrdinaryWorkflow_NeverAsksTheRendezvous()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = CreateWorkflow(mailboxId: null, step);

        Assert.True((await executor.Execute(workflow, step, TestContext.Current.CancellationToken)).IsSuccess());

        fixture.RepositoryMock.Verify(
            r => r.ReadMailboxReceipt(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        Assert.Null(Assert.Single(command.Captured));
    }

    [Fact]
    public async Task Execute_OfAReceiveWorkflowsFirstStep_HandsTheCommandItsReceipt()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = CreateWorkflow(_mailboxId, step);
        var receipt = Delivered;
        SetupReceipt(fixture, workflow.DatabaseId, new MailboxReceiptResult.Resolved(receipt));

        Assert.True((await executor.Execute(workflow, step, TestContext.Current.CancellationToken)).IsSuccess());

        Assert.Same(receipt, Assert.Single(command.Captured));
    }

    [Fact]
    public async Task Execute_OfAReceiveWorkflowsLaterSteps_HandsThemNothing()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var second = CreateStep(1);
        var workflow = CreateWorkflow(_mailboxId, CreateStep(0), second);

        Assert.True((await executor.Execute(workflow, second, TestContext.Current.CancellationToken)).IsSuccess());

        fixture.RepositoryMock.Verify(
            r => r.ReadMailboxReceipt(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
        Assert.Null(Assert.Single(command.Captured));
    }

    [Fact]
    public async Task Execute_ReReadsTheRendezvous_OnEveryAttemptOfTheStep()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = CreateWorkflow(_mailboxId, step);
        SetupReceipt(fixture, workflow.DatabaseId, new MailboxReceiptResult.Resolved(Delivered));

        await executor.Execute(workflow, step, TestContext.Current.CancellationToken);
        await executor.Execute(workflow, step, TestContext.Current.CancellationToken);
        await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        fixture.RepositoryMock.Verify(
            r => r.ReadMailboxReceipt(workflow.DatabaseId, It.IsAny<CancellationToken>()),
            Times.Exactly(3)
        );
        Assert.Equal(3, command.Captured.Count);
        Assert.Equal(command.Captured[0], command.Captured[1]);
        Assert.Equal(command.Captured[0], command.Captured[2]);
    }

    [Fact]
    public async Task Execute_WhenTheReceiverHoldsNoPosition_FailsCriticallyInsteadOfReportingNoMessage()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = CreateWorkflow(_mailboxId, step);
        SetupReceipt(fixture, workflow.DatabaseId, new MailboxReceiptResult.Unregistered());

        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        Assert.True(result.IsCriticalError());
        Assert.Contains("holds no position", result.Message, StringComparison.Ordinal);
        Assert.Empty(command.Captured);
    }

    [Fact]
    public async Task Execute_WhenTheMailboxIsStillOpenAtTheReceiversPosition_FailsCriticallyInsteadOfReportingNoMessage()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = CreateWorkflow(_mailboxId, step);
        SetupReceipt(fixture, workflow.DatabaseId, new MailboxReceiptResult.Undecided(_mailboxId, 3));

        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        Assert.True(result.IsCriticalError());
        Assert.Contains("with no message there", result.Message, StringComparison.Ordinal);
        Assert.Empty(command.Captured);
    }

    [Fact]
    public async Task Execute_WhenTheRendezvousReadThrows_IsRetryableRatherThanCritical()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var step = CreateStep(0);
        var workflow = CreateWorkflow(_mailboxId, step);
        fixture
            .RepositoryMock.Setup(r => r.ReadMailboxReceipt(workflow.DatabaseId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("database down"));

        var result = await executor.Execute(workflow, step, TestContext.Current.CancellationToken);

        Assert.True(result.IsRetryableError());
        Assert.Empty(command.Captured);
    }

    [Fact]
    public async Task Execute_CountsTheTwoCriticalStatesUnderTheirOwnMetric_AndCountsNothingForALegitimateAnswer()
    {
        var command = new ReceiptCapturingCommand();
        using var fixture = WorkflowEngineTestFixture.Create(services => services.AddSingleton<ICommand>(command));
        var executor = fixture.ServiceProvider.GetRequiredService<IWorkflowExecutor>();

        var unregistered = CreateWorkflow(_mailboxId, CreateStep(0));
        var undecided = CreateWorkflow(_mailboxId, CreateStep(0));
        var closed = CreateWorkflow(_mailboxId, CreateStep(0));
        var ordinary = CreateWorkflow(mailboxId: null, CreateStep(0));
        SetupReceipt(fixture, unregistered.DatabaseId, new MailboxReceiptResult.Unregistered());
        SetupReceipt(fixture, undecided.DatabaseId, new MailboxReceiptResult.Undecided(_mailboxId, 3));
        SetupReceipt(
            fixture,
            closed.DatabaseId,
            new MailboxReceiptResult.Resolved(MailboxReceipt.Closed(_mailboxId, 0, MailboxDisposedReason.Deadline))
        );

        using var collector = new MeterCollector();

        foreach (var workflow in new[] { unregistered, undecided, closed, ordinary })
            await executor.Execute(workflow, workflow.Steps[0], TestContext.Current.CancellationToken);

        Assert.Equal(
            new Dictionary<string, long>(StringComparer.Ordinal) { ["unregistered"] = 1, ["undecided"] = 1 },
            collector.ByTag("engine.mailboxes.rendezvous.violations", "state")
        );
    }

    private static void SetupReceipt(WorkflowEngineTestFixture fixture, Guid workflowId, MailboxReceiptResult result) =>
        fixture
            .RepositoryMock.Setup(r => r.ReadMailboxReceipt(workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

    /// <summary>Local rather than the TestKit's collector, which this project does not reference.</summary>
    private sealed class MeterCollector : IDisposable
    {
        private readonly MeterListener _listener;
        private readonly ConcurrentBag<(string Name, long Value, KeyValuePair<string, object?>[] Tags)> _taken = [];

        public MeterCollector()
        {
            _listener = new MeterListener
            {
                InstrumentPublished = (instrument, listener) =>
                {
                    if (instrument.Meter.Name == Metrics.Meter.Name)
                        listener.EnableMeasurementEvents(instrument);
                },
            };
            _listener.SetMeasurementEventCallback<long>(
                (instrument, measurement, tags, _) => _taken.Add((instrument.Name, measurement, tags.ToArray()))
            );
            _listener.Start();
        }

        public Dictionary<string, long> ByTag(string instrumentName, string tagKey) =>
            _taken
                .Where(m => m.Name == instrumentName)
                .GroupBy(m => (string)m.Tags.Single(t => t.Key == tagKey).Value!)
                .ToDictionary(g => g.Key, g => g.Sum(m => m.Value), StringComparer.Ordinal);

        public void Dispose() => _listener.Dispose();
    }
}
