using System.Diagnostics;
using Altinn.App.Core.Models;
using static Altinn.App.Core.Features.Telemetry.InstanceDataAccessor;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    private const string ActivityName = "Telemetry.InstanceDataAccessor";

    internal Activity? StartVerifyDataElementsUnchangedSincePreviousChanges()
    {
        var activity = LibraryActivitySource.StartActivity(
            $"{ActivityName}.VerifyDataElementsUnchangedSincePreviousChanges"
        );
        return activity;
    }

    internal Activity? StartRemoveHiddenDataForValidation()
    {
        return LibraryActivitySource.StartActivity($"{Prefix}.RemoveHiddenDataForValidation");
    }

    internal Activity? StartSaveChanges(DataElementChanges instance)
    {
        var activity = LibraryActivitySource.StartActivity($"{Prefix}.SaveChanges");
        activity?.AddTag("altinn.instance.changed_data_elements.count", instance.AllChanges.Count);
        return activity;
    }

    internal static class InstanceDataAccessor
    {
        internal const string Prefix = "InstanceDataAccessor";
    }
}
