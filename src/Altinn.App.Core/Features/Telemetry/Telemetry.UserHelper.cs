using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetUserContextActivity() => ActivitySource.StartActivity("UserHelper.GetUserContext");
}
