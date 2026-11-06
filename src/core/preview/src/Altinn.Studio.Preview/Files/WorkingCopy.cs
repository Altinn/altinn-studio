using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Preview.Files;

/// <summary>
/// One developer's clone of one app, which Designer keeps in <c>{developer}/{org}/{app}</c> below the repository root.
/// Each name is a single, safe path segment, so the three together always name a directory inside the root.
/// </summary>
internal sealed partial record WorkingCopy
{
    private WorkingCopy(string developer, string org, string app)
    {
        Developer = developer;
        Org = org;
        App = app;
    }

    /// <summary>The Gitea user name of the developer whose clone it is.</summary>
    public string Developer { get; }

    /// <summary>The service owner, which is the Gitea organization the app belongs to.</summary>
    public string Org { get; }

    /// <summary>The app, which is the Gitea repository.</summary>
    public string App { get; }

    public static bool TryCreate(
        string? developer,
        string? org,
        string? app,
        [NotNullWhen(true)] out WorkingCopy? workingCopy
    )
    {
        workingCopy =
            IsGiteaName(developer) && IsGiteaName(org) && app is not null && AppName().IsMatch(app)
                ? new WorkingCopy(developer, org, app)
                : null;
        return workingCopy is not null;
    }

    private static bool IsGiteaName([NotNullWhen(true)] string? name) => name is not null && GiteaName().IsMatch(name);

    /// <summary>
    /// Gitea's rule for user and organization names. A name starts and ends with a letter or digit, so it is never
    /// <c>.</c> or <c>..</c>.
    /// </summary>
    [GeneratedRegex("^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,38}[A-Za-z0-9])?$", RegexOptions.CultureInvariant)]
    private static partial Regex GiteaName();

    /// <summary>Designer's rule for app names.</summary>
    [GeneratedRegex("^[a-z][a-z0-9-]{1,28}[a-z0-9]$", RegexOptions.CultureInvariant)]
    private static partial Regex AppName();
}
