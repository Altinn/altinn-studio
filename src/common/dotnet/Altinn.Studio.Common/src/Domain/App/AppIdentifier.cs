using System;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// Identifies an app as <c>&lt;org&gt;/&lt;app&gt;</c>, such as <c>ttd/apps-test</c>, which is also what its repository
/// in Studio is named.
/// </summary>
/// <param name="Org">
/// The <c>org</c> of the app's ID: the code of the service owner that owns the app. A repository in Altinn Studio
/// whose owner is no service owner's is not identified by this type.
/// </param>
/// <param name="App">The app's name.</param>
/// <remarks>
/// It is a struct, so <c>default</c> is an instance that no parsing produced. Reading the values of its parts throws.
/// </remarks>
public readonly record struct AppIdentifier(ServiceOwnerCode Org, AppName App)
{
    /// <summary>Parses a service owner code and an app's name.</summary>
    public static bool TryParse(string? org, string? app, out AppIdentifier identifier)
    {
        bool parsed =
            ServiceOwnerCode.TryParse(org, out ServiceOwnerCode code) & AppName.TryParse(app, out AppName name);
        identifier = parsed ? new AppIdentifier(code, name) : default;
        return parsed;
    }

    /// <summary>Parses a service owner code and an app's name, or throws when one is not valid.</summary>
    /// <exception cref="ArgumentException">The service owner code or the app's name is not valid.</exception>
    public static AppIdentifier Parse(string org, string app) => new(ServiceOwnerCode.Parse(org), AppName.Parse(app));

    /// <summary>Parses <c>org/app</c>, the form <see cref="ToString"/> writes.</summary>
    public static bool TryParse(string? value, out AppIdentifier identifier)
    {
        int slash = value.AsSpan().IndexOf('/');
        if (value is null || slash < 0)
        {
            identifier = default;
            return false;
        }

        return TryParse(value.Substring(0, slash), value.Substring(slash + 1), out identifier);
    }

    /// <summary>Returns <c>org/app</c>.</summary>
    public override string ToString() => $"{Org}/{App}";
}
