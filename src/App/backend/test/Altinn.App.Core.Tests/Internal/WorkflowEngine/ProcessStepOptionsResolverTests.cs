using System.Reflection;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ProcessStepOptionsResolverTests
{
    private static ProcessStepOptionsResolver CreateResolver()
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        var appImplFactory = services.BuildServiceProvider().GetRequiredService<AppImplementationFactory>();

        // ExecuteServiceTask is the only command declaring a tier-2 default (10 min) today.
        // Only its DefaultStepOptions are read here; nothing executes.
        return new ProcessStepOptionsResolver([
            new ExecuteServiceTask(appImplFactory, TestMailboxDeliveryEnvelope.Create()),
        ]);
    }

    [Fact]
    public void Resolve_OrdinaryCommand_NoTierApplies_ReturnsNull()
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve("StartTask");

        Assert.Null(result);
    }

    // ── Service task steps: the options the pipeline item declared, over the command default ──

    [Fact]
    public void Resolve_ServiceTaskStep_WithoutItemOptions_UsesCommandDefault()
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve(ExecuteServiceTask.Key);

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime);
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTaskStep_ItemTimeout_WinsOverCommandDefault()
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve(
            ExecuteServiceTask.Key,
            declaredOptions: new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) }
        );

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime); // tier 3
        // The unset field falls through: ExecuteServiceTask has no tier-2 retry default, so null.
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_ServiceTaskStep_ItemBothFields_HonorsBothIndependently()
    {
        // An item may set BOTH fields; each resolves on its own (no all-or-nothing behavior).
        var resolver = CreateResolver();

        var result = resolver.Resolve(
            ExecuteServiceTask.Key,
            declaredOptions: new ProcessStepOptions
            {
                MaxExecutionTime = TimeSpan.FromHours(2),
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
            }
        );

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromHours(2), result.MaxExecutionTime); // tier 3, overriding the 10 min tier-2 default
        Assert.NotNull(result.RetryStrategy); // tier 3
        Assert.Equal(TimeSpan.FromSeconds(5), result.RetryStrategy.BaseInterval);
        Assert.Equal(3, result.RetryStrategy.MaxRetries);
    }

    [Fact]
    public void Resolve_ServiceTaskStep_ItemRetryOnly_FallsBackToCommandTimeout()
    {
        var resolver = CreateResolver();

        var result = resolver.Resolve(
            ExecuteServiceTask.Key,
            declaredOptions: new ProcessStepOptions
            {
                RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
            }
        );

        Assert.NotNull(result);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime); // tier 2
        Assert.NotNull(result.RetryStrategy); // tier 3
        Assert.Equal(TimeSpan.FromSeconds(5), result.RetryStrategy.BaseInterval);
    }

    [Fact]
    public void Resolve_ServiceTaskStep_WaitBudgetOnly_IsResolvedIndependently()
    {
        // An item that only needs a longer wait allowance (an eFormidling poll, say) must not have to
        // restate the timeout or retry strategy: each field falls through its own tiers.
        var resolver = CreateResolver();

        var result = resolver.Resolve(
            ExecuteServiceTask.Key,
            declaredOptions: new ProcessStepOptions { WaitBudget = TimeSpan.FromDays(7) }
        );

        Assert.NotNull(result);
        Assert.Equal(TimeSpan.FromDays(7), result.WaitBudget);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, result.MaxExecutionTime); // tier 2
        Assert.Null(result.RetryStrategy);
    }

    [Fact]
    public void Resolve_InvalidItemOptions_ThrowsAtResolve()
    {
        var resolver = CreateResolver();

        var ex = Assert.Throws<InvalidOperationException>(() =>
            resolver.Resolve(
                ExecuteServiceTask.Key,
                declaredOptions: new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-1) }
            )
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
    }

    [Fact]
    public void Resolve_NonPositiveWaitBudget_ThrowsAtResolve()
    {
        var resolver = CreateResolver();

        var ex = Assert.Throws<InvalidOperationException>(() =>
            resolver.Resolve(
                ExecuteServiceTask.Key,
                declaredOptions: new ProcessStepOptions { WaitBudget = TimeSpan.Zero }
            )
        );

        Assert.Contains(nameof(ProcessStepOptions.WaitBudget), ex.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// <c>Resolve</c> enumerates <see cref="ProcessStepOptions"/>' fields by hand when it merges the item's
    /// options with the command default. A field added to that record and forgotten there would be silently
    /// dropped for every step. Record equality is what keeps this honest: the assertion never names a field,
    /// so it starts failing on its own once one goes missing.
    /// </summary>
    [Fact]
    public void Resolve_ServiceTaskStep_CarriesEveryStepOptionsField()
    {
        ProcessStepOptions everyField = new()
        {
            MaxExecutionTime = TimeSpan.FromMinutes(7),
            RetryStrategy = ProcessStepRetryStrategy.Constant(TimeSpan.FromSeconds(2), maxRetries: 4),
            WaitBudget = TimeSpan.FromHours(9),
        };

        // Tripwire for the fixture itself: a new field left unset here would be null on both sides of
        // the comparison below, which would pass while proving nothing.
        foreach (PropertyInfo property in typeof(ProcessStepOptions).GetProperties())
        {
            Assert.NotNull(property.GetValue(everyField));
        }

        // The resolver builds a copy rather than passing the instance through, so every field has to survive it.
        Assert.Equal(everyField, CreateResolver().Resolve(ExecuteServiceTask.Key, everyField));
    }

    // ── The step: its own item's options, found by what it carries ─────────────────────────────

    /// <summary>
    /// The handler's own options ride the step, so every hop that enqueues a receiver resolves them the same way
    /// by construction: the planner's receive workflows and the relay's successor receivers build the step alike.
    /// </summary>
    [Fact]
    public void ToStepRequest_ReceiveStep_ResolvesTheAnsweringHandlersOptions()
    {
        ProcessStepOptionsResolver resolver = CreateResolver();

        StepRequest resolved = WorkflowCommandSet
            .CreateItemStep(
                "pipeline",
                itemIndex: 1,
                new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) },
                stepName: null
            )
            .ToStepRequest(resolver);

        Assert.Equal(TimeSpan.FromHours(2), resolved.Command.MaxExecutionTime); // the handler's own
        Assert.Null(resolved.Command.WaitBudget); // never another item's
    }

    /// <summary>
    /// A step whose OperationId is a display identity (a pipeline stage or the mailbox mint, both of which
    /// append the item index) must still resolve its command's own tier-2 default. Keying off the OperationId
    /// instead would miss <c>_commandDefaults</c> silently: the miss looks exactly like "this command
    /// declares no default", so a command that does declare one would have it dropped without a sound.
    /// </summary>
    [Theory]
    [InlineData(0)]
    [InlineData(null)]
    public void ToStepRequest_StepWithADisplayOperationId_StillFindsTheCommandsOwnDefault(int? serviceTaskItemIndex)
    {
        ProcessStepOptionsResolver resolver = CreateResolver();

        StepRequest resolved = new PlannedStep
        {
            CommandKey = ExecuteServiceTask.Key,
            OperationId = $"{ExecuteServiceTask.Key}: {serviceTaskItemIndex?.ToString() ?? "Anything"}",
        }.ToStepRequest(resolver);

        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, resolved.Command.MaxExecutionTime);
    }
}
