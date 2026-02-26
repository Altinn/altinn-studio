using System.Diagnostics;
using Altinn.App.Core.Models;
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

    internal Activity? StartValidateIncrementalActivity(string taskId, DataElementChanges changes)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(taskId);
        ArgumentNullException.ThrowIfNull(changes);

        var activity = ActivitySource.StartActivity($"{Prefix}.ValidateIncremental");
        activity?.SetTaskId(taskId);
        // Log the IDs of the elements that have changed together with their data type
        var changesPrefix = "ChangedDataElements";
        var now = DateTimeOffset.UtcNow;

        var allChanges = changes.AllChanges;

        ActivityTagsCollection tags = new([new($"{changesPrefix}.count", allChanges.Count)]);
        for (var i = 0; i < allChanges.Count; i++)
        {
            var change = allChanges[i];
            tags.Add(new($"{changesPrefix}.{i}.Id", change.DataElementIdentifier.Id));
        }
        activity?.AddEvent(new ActivityEvent(changesPrefix, now, tags));
        return activity;
    }

    internal Activity? StartRunValidatorActivity(IValidator validator) =>
        ActivitySource
            .StartActivity($"{Prefix}.RunValidator")
            ?.SetTag(InternalLabels.ValidatorType, validator.GetType().Name)
            .SetTag(InternalLabels.ValidatorSource, validator.ValidationSource)
            .SetTag(InternalLabels.ValidatorRemoveHiddenData, validator.ShouldRunAfterRemovingHiddenData);

    internal static class Validation
    {
        internal const string Prefix = "Validation";
    }
}
