using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.Validation;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private static void InitValidation(InitContext context)
    {
        // Currently no initialization is needed
    }

    internal Activity? StartValidateInstanceAtTaskActivity(string taskId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(taskId);

        var activity = ActivitySource.StartActivity($"{Prefix}.ValidateInstanceAtTask");
        activity?.SetTaskId(taskId);
        return activity;
    }

    internal Activity? StartValidateIncrementalActivity(string taskId, List<DataElementChange> changes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(taskId);
        ArgumentNullException.ThrowIfNull(changes);

        var activity = ActivitySource.StartActivity($"{Prefix}.ValidateIncremental");
        activity?.SetTaskId(taskId);
        // Log the IDs of the elements that have changed together with their data type
        var changesPrefix = "ChangedDataElements";
        var now = DateTimeOffset.UtcNow;

        ActivityTagsCollection tags = new([new($"{changesPrefix}.count", changes.Count)]);
        for (var i = 0; i < changes.Count; i++)
        {
            var change = changes[i];
            tags.Add(new($"{changesPrefix}.{i}.Id", change.DataElement.Id));
        }
        activity?.AddEvent(new ActivityEvent(changesPrefix, now, tags));
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
