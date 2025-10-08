using Altinn.App.Core.Extensions;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models;

/// <summary>
/// Class representing the id of an instance.
/// </summary>
public sealed class AppIdentifier : IEquatable<AppIdentifier>
{
    /// <summary>
    /// Organization that owns the app.
    /// </summary>
    public string Org { get; }

    /// <summary>
    /// Application name
    /// </summary>
    public string App { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="AppIdentifier"/> class.
    /// </summary>
    /// <param name="org">The app owner.</param>
    /// <param name="app">The app name.</param>
    public AppIdentifier(string org, string app)
    {
        if (string.IsNullOrEmpty(org))
        {
            throw new ArgumentNullException(nameof(org));
        }

        if (string.IsNullOrEmpty(app))
        {
            throw new ArgumentNullException(nameof(app));
        }

        if (app.Contains('/'))
        {
            throw new ArgumentException(
                $"The '{nameof(app)}' parameter should not contain any forward slashes. You likely passed the full AppId instead of just the app name."
            );
        }

        Org = org;
        App = app;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="AppIdentifier"/> class.
    /// </summary>
    /// <param name="id">Application id on the form org/app</param>
    public AppIdentifier(string id)
    {
        if (string.IsNullOrEmpty(id))
        {
            throw new ArgumentNullException(nameof(id));
        }

        if (id.ContainsExactlyOne('/'))
        {
            (Org, App) = DeconstructAppId(id);
            return;
        }

        throw new ArgumentOutOfRangeException(
            nameof(id),
            "You must have exactly only one / (forward slash) in your id"
        );
    }

    /// <summary>
    /// Get an AppIdentifier from an Instance.AppID
    /// </summary>
    public AppIdentifier(Instance instance)
        : this(instance.AppId) { }

    /// <summary>
    /// Deconstructs an app id into it's two logical parts - org and app.
    /// </summary>
    /// <param name="appId">App identifier on the form {org}/{app}</param>
    /// <returns>A 2-tuple with the org and the app</returns>
    private static (string org, string app) DeconstructAppId(string appId)
    {
        var deconstructed = appId.Split("/");
        string org = deconstructed[0];
        string app = deconstructed[1];

        return (org, app);
    }

    ///<inheritDoc/>
    public override bool Equals(object? obj)
    {
        return Equals(obj as AppIdentifier);
    }

    ///<inheritDoc/>
    public bool Equals(AppIdentifier? other)
    {
        return Org != null
            && App != null
            && Org.Equals(other?.Org, StringComparison.OrdinalIgnoreCase)
            && App.Equals(other?.App, StringComparison.OrdinalIgnoreCase);
    }

    ///<inheritDoc/>
    public override string ToString()
    {
        return $"{Org}/{App}";
    }

    ///<inheritDoc/>
    public override int GetHashCode()
    {
        return Org.GetHashCode() ^ App.GetHashCode();
    }

    /// <summary>
    /// A absolute url expected to point to an Altinn 3 app ie. the first two segments of the path
    /// has to be the organization and the app name for example: https://org.apps.altinn.no/{org}/{app}/api/...
    /// </summary>
    /// <param name="url">The url to parse</param>
    /// <returns>A new instance of <see cref="AppIdentifier"/></returns>
    public static AppIdentifier CreateFromUrl(string url)
    {
        ArgumentNullException.ThrowIfNull(url);

        if (!Uri.IsWellFormedUriString(url, UriKind.Absolute))
        {
            throw new ArgumentException(
                $"The provided url ({url}) is not well formed. Please check that it is an absolute url with at least two path segments."
            );
        }

        Uri uri = new(url, UriKind.Absolute);

        // Remove the first slash as this will only result in an empty first segment when splitting.
        string[] segments = uri.PathAndQuery[1..].Split("/");

        if (segments.Length < 2)
        {
            throw new ArgumentException($"The provided url ({url} must contain at least two path segments.)");
        }

        var org = segments[0];
        var app = segments[1];

        return new AppIdentifier(org, app);
    }
}
