using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetOrganizationActivity(string? orgNr)
    {
        var activity = ActivitySource.StartActivity("RegisterERClient.GetOrganization");
        activity?.SetOrganizationNumber(orgNr);
        return activity;
    }
}
