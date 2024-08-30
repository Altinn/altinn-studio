using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetUserProfileActivity(int? userId)
    {
        var activity = ActivitySource.StartActivity("ProfileClient.GetUserProfile");
        activity?.SetUserId(userId);
        return activity;
    }
}
