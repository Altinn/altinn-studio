namespace Altinn.Studio.Observability.Proxy.Auth;

internal sealed class ObservabilitySource
{
    private readonly HashSet<string> _allowedRouteGroups;

    public ObservabilitySource(string sourceIdentity, string tokenTag, IEnumerable<string> allowedRouteGroups)
    {
        SourceIdentity = sourceIdentity;
        TokenTag = tokenTag;
        _allowedRouteGroups = allowedRouteGroups
            .Where(group => !string.IsNullOrWhiteSpace(group))
            .Select(group => group.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public string SourceIdentity { get; }

    /// <summary>Which of the identity's accepted tokens was presented; see <see cref="Auth.TokenTag"/>.</summary>
    public string TokenTag { get; }

    /// <summary>
    /// A token reaches only the route groups it was granted. A token that resolves to none is
    /// rejected everywhere rather than granted everything.
    /// </summary>
    public bool AllowsRouteGroup(string routeGroup)
    {
        return _allowedRouteGroups.Contains(routeGroup);
    }
}
