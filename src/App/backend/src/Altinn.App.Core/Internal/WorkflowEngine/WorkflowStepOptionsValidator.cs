using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Validates the per-step execution options (<see cref="IProcessStepConfigurable.StepOptions"/>) declared
/// by the app's service tasks and task/process lifecycle hooks, once at startup. A misconfigured handler
/// (e.g. a negative timeout or a zero-delay unbounded retry strategy) otherwise only surfaces the first
/// time a citizen advances the affected task — as a failed transition, in production. Validating at boot
/// turns that into a fast, unmissable startup failure.
/// </summary>
/// <remarks>
/// Reading <see cref="IProcessStepConfigurable.StepOptions"/> requires instantiating each handler, so this
/// resolves them in a fresh DI scope (never the root provider, which would reject scoped handlers). If a
/// handler cannot be constructed at startup — e.g. its constructor needs request-scoped state that only
/// exists during a callback — its type is skipped with a warning rather than failing the whole app; the
/// per-step enqueue-time check in <see cref="ProcessNextRequestFactory"/> remains as a backstop. Only an
/// actual options-validation failure fails startup.
/// </remarks>
internal sealed class WorkflowStepOptionsValidator : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WorkflowStepOptionsValidator> _logger;

    public WorkflowStepOptionsValidator(IServiceScopeFactory scopeFactory, ILogger<WorkflowStepOptionsValidator> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        using IServiceScope scope = _scopeFactory.CreateScope();
        IServiceProvider sp = scope.ServiceProvider;

        var errors = new List<string>();
        ValidateHandlers<IServiceTask>(sp, errors);
        ValidateHandlers<IOnTaskStartingHandler>(sp, errors);
        ValidateHandlers<IOnTaskEndingHandler>(sp, errors);
        ValidateHandlers<IOnTaskAbandonHandler>(sp, errors);
        ValidateHandlers<IOnProcessEndingHandler>(sp, errors);

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                "One or more process handlers declare invalid StepOptions:"
                    + Environment.NewLine
                    + string.Join(Environment.NewLine, errors)
            );
        }

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private void ValidateHandlers<THandler>(IServiceProvider serviceProvider, List<string> errors)
        where THandler : class, IProcessStepConfigurable
    {
        IReadOnlyList<THandler> handlers;
        try
        {
            handlers = serviceProvider.GetServices<THandler>().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not resolve {HandlerType} implementations to validate StepOptions at startup; "
                    + "they will be validated when first used instead.",
                typeof(THandler).Name
            );
            return;
        }

        foreach (THandler handler in handlers)
        {
            ProcessStepOptions? options = handler.StepOptions;
            if (options is null)
                continue;

            try
            {
                options.Validate();
            }
            catch (InvalidOperationException ex)
            {
                errors.Add($"  - {handler.GetType().FullName} ({typeof(THandler).Name}): {ex.Message}");
            }
        }
    }
}
