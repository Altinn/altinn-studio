using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;

namespace WorkflowCommandCustomer;

// This assembly is deliberately not an InternalsVisibleTo friend of Core or Api.
public static class CustomerRegistration
{
    public static void Register(IServiceCollection services)
    {
        services.AddSingleton<CommandTestState>();
        services.AddScoped<CommandScope>();
        services.AddScoped<IWorkflowEngineCommand>(sp => new RecordCommand(
            sp.GetRequiredService<CommandTestState>(),
            sp.GetRequiredService<CommandScope>()
        ));
        services.AddScoped<IWorkflowEngineCommand, OptionalCommand>();
        services.AddScoped<IProcessTask, CustomerTask>();
        services.AddScoped<IServiceTask, CustomerSimpleTask>();
        services.AddScoped<IPipelineServiceTask, CustomerPipelineTask>();
    }
}

public sealed record CommandInput(string TaskId, string Phase, string Value);

public sealed record CommandObservation(
    string TaskId,
    string Phase,
    string Value,
    Guid WorkflowId,
    Guid StepId,
    Guid ScopeId,
    int Attempt,
    string[] PriorPhases,
    string Outcome
);

public sealed record CommandSnapshot(
    CommandObservation[] Observations,
    Guid[] DisposedScopes,
    bool SelectCommands,
    string AssemblyName
);

public sealed record CommandControl(
    string FailureMode = "once",
    bool SelectCommands = true,
    bool MalformedPayload = false
);

public sealed record StoredCommand(string TaskId, string Phase, string Value, Guid StepId);

public sealed class CommandTestState
{
    private readonly object _gate = new();
    private readonly List<CommandObservation> _observations = [];
    private readonly HashSet<Guid> _disposed = [];
    private CommandControl _control = new();
    public CommandControl Control
    {
        get
        {
            lock (_gate)
                return _control;
        }
    }

    public void Reset(CommandControl control)
    {
        lock (_gate)
        {
            _control = control;
            _observations.Clear();
            _disposed.Clear();
        }
    }

    public void Allow(bool selectCommands)
    {
        lock (_gate)
            _control = _control with
            {
                FailureMode = "none",
                SelectCommands = selectCommands,
                MalformedPayload = false,
            };
    }

    public int NextAttempt(Guid stepId)
    {
        lock (_gate)
            return _observations.Count(x => x.StepId == stepId) + 1;
    }

    public void Record(CommandObservation observation)
    {
        lock (_gate)
            _observations.Add(observation);
    }

    public void Disposed(Guid id)
    {
        lock (_gate)
            _disposed.Add(id);
    }

    public CommandSnapshot Snapshot()
    {
        lock (_gate)
            return new(
                _observations.ToArray(),
                _disposed.ToArray(),
                _control.SelectCommands,
                typeof(RecordCommand).Assembly.GetName().Name!
            );
    }
}

public sealed class CommandScope(CommandTestState state) : IDisposable
{
    public Guid Id { get; } = Guid.NewGuid();
    public bool IsDisposed { get; private set; }

    public void Dispose()
    {
        IsDisposed = true;
        state.Disposed(Id);
    }
}

public sealed class RecordCommand(CommandTestState state, CommandScope scope) : IWorkflowEngineCommand
{
    public const string Key = "Customer.Record";

    public string GetKey() => Key;

    public ProcessStepOptions DefaultStepOptions =>
        new() { RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(1), maxRetries: 2) };

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        context.CancellationToken.ThrowIfCancellationRequested();
        if (scope.IsDisposed)
            throw new InvalidOperationException("A disposed command scope was reused.");
        CommandInput? input;
        try
        {
            input = context.CommandPayload is null
                ? null
                : JsonSerializer.Deserialize<CommandInput>(context.CommandPayload);
        }
        catch (JsonException)
        {
            return ProcessEngineCommandResult.FailedPermanent("Invalid customer JSON.", "CustomerInvalidInput");
        }
        if (input is null || string.IsNullOrEmpty(input.TaskId) || string.IsNullOrEmpty(input.Phase))
            return ProcessEngineCommandResult.FailedPermanent("Missing customer input.", "CustomerInvalidInput");
        var entries = await CommandData.Read(context.InstanceDataMutator);
        var prior = entries.Select(x => x.TaskId + "/" + x.Phase).ToArray();
        if (entries.Any(x => x.Phase == "uncommitted"))
            return ProcessEngineCommandResult.FailedPermanent("A failed attempt's changes were saved.");
        int attempt = state.NextAttempt(context.StepId);
        bool fail =
            input is { TaskId: "Task_Custom", Phase: "second" }
            && (state.Control.FailureMode == "always" || state.Control.FailureMode == "once" && attempt == 1);
        state.Record(
            new(
                input.TaskId,
                input.Phase,
                input.Value,
                context.WorkflowId,
                context.StepId,
                scope.Id,
                attempt,
                prior,
                fail ? "retryable" : "completed"
            )
        );
        entries.Add(new(input.TaskId, fail ? "uncommitted" : input.Phase, input.Value, context.StepId));
        CommandData.Write(context.InstanceDataMutator, entries);
        return fail
            ? ProcessEngineCommandResult.FailedRetryable("Controlled customer failure.")
            : ProcessEngineCommandResult.Completed();
    }
}

public sealed class OptionalCommand(CommandTestState state, CommandScope scope) : IWorkflowEngineCommand
{
    public const string Key = "Customer.Optional";

    public string GetKey() => Key;

    public Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext context)
    {
        if (context.CommandPayload is not null)
            throw new InvalidOperationException("Optional input was changed.");
        state.Record(
            new("Task_Custom", "optional", "", context.WorkflowId, context.StepId, scope.Id, 1, [], "completed")
        );
        return Task.FromResult(ProcessEngineCommandResult.Completed());
    }
}

public static class CommandData
{
    public static async Task<List<StoredCommand>> Read(IInstanceDataAccessor data)
    {
        var element = data.GetDataElementsForType("command-log").SingleOrDefault();
        return element is null
            ? []
            : JsonSerializer.Deserialize<List<StoredCommand>>((await data.GetBinaryData(element)).Span)!;
    }

    public static void Write(IInstanceDataMutator data, List<StoredCommand> entries)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(entries);
        var element = data.GetDataElementsForType("command-log").SingleOrDefault();
        if (element is null)
            data.AddBinaryDataElement("command-log", "application/json", "commands.json", bytes);
        else
            data.UpdateBinaryDataElement(element, "application/json", bytes);
    }

    public static WorkflowCommandRef Ref(string taskId, string phase, string value) =>
        new(RecordCommand.Key, JsonSerializer.Serialize(new CommandInput(taskId, phase, value)));
}

public sealed class CustomerTask(CommandTestState state) : IProcessTask
{
    public string Type => "customer";

    public IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId)
    {
        if (!state.Control.SelectCommands)
            return [];
        if (state.Control.MalformedPayload)
            return [new(RecordCommand.Key, "{")];
        return
        [
            CommandData.Ref(taskId, "first", "one"),
            CommandData.Ref(taskId, "second", "two"),
            new(OptionalCommand.Key),
        ];
    }

    public IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) =>
        [CommandData.Ref(taskId, "end", "custom")];
}

public sealed class CustomerSimpleTask(CommandTestState state, IInstanceClient instances) : IServiceTask
{
    public string Type => "customer-simple";

    public IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId) =>
        [CommandData.Ref(taskId, "start", "simple")];

    public IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) =>
        [CommandData.Ref(taskId, "end", "simple")];

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        await CustomerBodies.Record(state, instances, context, "simple-body", "Task_Simple");
        return ServiceTaskResult.Success();
    }
}

public sealed class CustomerPipelineTask(CommandTestState state, IInstanceClient instances) : IPipelineServiceTask
{
    public string Type => "customer-pipeline";

    public IReadOnlyList<WorkflowCommandRef> GetStartCommands(string taskId) =>
        [CommandData.Ref(taskId, "start", "pipeline")];

    public IReadOnlyList<WorkflowCommandRef> GetEndCommands(string taskId) =>
        [CommandData.Ref(taskId, "end", "pipeline")];

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => pipeline.Stage(Stage).Finally(Finish);

    private async Task<ServiceTaskStageResult> Stage(ServiceTaskContext context)
    {
        await CustomerBodies.Record(state, instances, context, "pipeline-stage", "Task_Pipeline");
        return ServiceTaskStageResult.Completed();
    }

    private async Task<ServiceTaskResult> Finish(ServiceTaskContext context)
    {
        await CustomerBodies.Record(state, instances, context, "pipeline-finish", "Task_Pipeline");
        return ServiceTaskResult.Success();
    }
}

internal static class CustomerBodies
{
    public static async Task Record(
        CommandTestState state,
        IInstanceClient instances,
        ServiceTaskContext context,
        string phase,
        string taskId
    )
    {
        var stored = await instances.GetInstance(
            context.InstanceDataMutator.Instance,
            StorageAuthenticationMethod.ServiceOwner(),
            context.CancellationToken
        );
        if (stored.Process.CurrentTask.ElementId != taskId)
            throw new InvalidOperationException("Service body ran before its process state was committed.");
        var prior = await CommandData.Read(context.InstanceDataMutator);
        if (!prior.Any(x => x.TaskId == taskId && x.Phase == "start"))
            throw new InvalidOperationException("Service body cannot see its start command's data.");
        state.Record(
            new(
                taskId,
                phase,
                "",
                context.WorkflowId,
                context.StepId,
                Guid.Empty,
                1,
                prior.Select(x => x.TaskId + "/" + x.Phase).ToArray(),
                "completed"
            )
        );
    }
}
