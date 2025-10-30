using System.Diagnostics;
using Altinn.App.Core.Models;
using static Altinn.App.Core.Features.Telemetry.InstanceDataAccessor;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private const string ActivityName = "Telemetry.InstanceDataAccessor";

    internal Activity? StartVerifyDataElementsUnchangedSincePreviousChanges()
    {
        var activity = ActivitySource.StartActivity($"{ActivityName}.VerifyDataElementsUnchangedSincePreviousChanges");
        return activity;
    }

    internal Activity? StartRemoveHiddenDataForValidation()
    {
        return ActivitySource.StartActivity($"{Prefix}.RemoveHiddenDataForValidation");
    }

    internal Activity? StartSaveChanges(DataElementChanges instance)
    {
        var activity = ActivitySource.StartActivity($"{Prefix}.SaveChanges");
        activity?.AddTag("numberOfChangedDataElements", instance.AllChanges.Count);
        return activity;
    }

    internal static class InstanceDataAccessor
    {
        internal const string Prefix = "InstanceDataAccessor";
    }
}
