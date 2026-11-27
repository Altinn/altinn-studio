using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetUserContextActivity() =>
        LibraryActivitySource.StartActivity("UserHelper.GetUserContext");
}
