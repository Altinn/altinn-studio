using System.Diagnostics;
using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Core.Features.Telemetry.Validation;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private void InitValidation(InitContext context) { }

    internal Activity? StartValidateInstanceAtTaskActivity(Instance instance, string taskId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(taskId);

        var activity = ActivitySource.StartActivity($"{Prefix}.ValidateInstanceAtTask");
        activity?.SetTaskId(taskId);
        activity?.SetInstanceId(instance);
        return activity;
    }

    internal Activity? StartValidateIncrementalActivity(
        Instance instance,
        string taskId,
        List<DataElementChange> changes
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(taskId);
        ArgumentNullException.ThrowIfNull(changes);

        var activity = ActivitySource.StartActivity($"{Prefix}.ValidateIncremental");
        activity?.SetTaskId(taskId);
        activity?.SetInstanceId(instance);
        // TODO: record the guid for the changed elements in a sensible list
        return activity;
    }

    internal Activity? StartRunValidatorActivity(IValidator validator) =>
        ActivitySource
            .StartActivity($"{Prefix}.RunValidator")
            ?.SetTag(InternalLabels.ValidatorType, validator.GetType().Name)
            .SetTag(InternalLabels.ValidatorSource, validator.ValidationSource);

    internal static class Validation
    {
        internal const string Prefix = "Validation";
    }
}
