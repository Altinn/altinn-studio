using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetUserProfileActivity()
    {
        var activity = LibraryActivitySource.StartActivity("ProfileClient.GetUserProfileSSN");
        return activity;
    }

    internal Activity? StartGetUserProfileActivity(int? userId)
    {
        var activity = LibraryActivitySource.StartActivity("ProfileClient.GetUserProfile");
        activity?.SetUserId(userId);
        return activity;
    }
}
