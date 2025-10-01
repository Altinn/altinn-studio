using System.Text.RegularExpressions;

namespace Altinn.App.Core.Models;

internal partial class AppResourceId
{
    [GeneratedRegex("app_[a-zA-Z0-9]+_[a-zA-Z0-9]+")]
    private static partial Regex AppIdRegex();

    internal AppResourceId(string org, string app)
    {
        Org = org;
        App = app;
    }

    internal AppResourceId(AppIdentifier appIdentifier)
    {
        Org = appIdentifier.Org;
        App = appIdentifier.App;
    }

    internal AppResourceId(string appId)
    {
        var deconstructed = appId.Split("/");
        Org = deconstructed[0];
        App = deconstructed[1];
    }

    internal string Org { get; init; }

    internal string App { get; init; }

    internal string Value => $"app_{Org}_{App}";

    internal static bool IsResourceId(AppResourceId? resourceId)
    {
        return resourceId != null && AppIdRegex().IsMatch(resourceId.Value);
    }

    internal static AppResourceId FromAppIdentifier(AppIdentifier appIdentifier)
    {
        return new AppResourceId(appIdentifier);
    }
}
