using System.Text.RegularExpressions;

namespace Altinn.App.Api.Infrastructure.Routing;

/// <summary>
/// Route constraint that validates URL slugs (org and app names).
/// Only allows lowercase alphanumeric characters and hyphens.
/// This prevents log injection and other attacks via route parameters.
/// </summary>
internal sealed partial class SlugRouteConstraint : IRouteConstraint
{
    /// <summary>
    /// The key used to register this constraint in the route options.
    /// Usage in routes: {org:slug}/{app:slug}
    /// </summary>
    public const string ConstraintKey = "slug";

    /// <inheritdoc/>
    public bool Match(
        HttpContext? httpContext,
        IRouter? route,
        string routeKey,
        RouteValueDictionary values,
        RouteDirection routeDirection
    )
    {
        if (!values.TryGetValue(routeKey, out var routeValue))
        {
            return false;
        }

        var value = routeValue?.ToString();
        if (string.IsNullOrEmpty(value))
        {
            return false;
        }

        return SlugPattern().IsMatch(value);
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$|^[a-z0-9]{1,2}$", RegexOptions.CultureInvariant)]
    private static partial Regex SlugPattern();
}
