using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Maskinporten.Models;

/// <summary>
/// <p>Describes a token request to Maskinporten.</p>
/// <p>Only <see cref="Scopes"/> is required. The remaining members map to optional (or conditionally required)
/// claims in the JWT grant assertion, and are documented individually.</p>
/// </summary>
/// <example>
/// <code>
/// var request = new MaskinportenTokenRequest
/// {
///     Scopes = ["altinn:serviceowner/instances.read"],
///     ConsumerOrg = OrganizationNumber.Parse("991825827"),
/// };
/// </code>
/// </example>
public sealed record MaskinportenTokenRequest
{
    private readonly ReadOnlyCollection<string> _scopes = ReadOnlyCollection<string>.Empty;
    private readonly string _formattedScopes = string.Empty;
    private readonly OrganizationNumber? _consumerOrg;
    private readonly string? _resource;

    /// <summary>
    /// <p>The scopes to claim authorization for with Maskinporten. At least one scope is required.</p>
    /// <p>Entries are split on whitespace, de-duplicated and ordered, so both <c>["a", "b"]</c> and
    /// <c>["a b"]</c> are accepted.</p>
    /// </summary>
    /// <exception cref="ArgumentException">No usable scope was supplied.</exception>
    public required IEnumerable<string> Scopes
    {
        get => _scopes;
        init
        {
            ArgumentNullException.ThrowIfNull(value, nameof(Scopes));

            // A null separator array splits on any whitespace. Ordering is safe because scope order carries no
            // meaning in OAuth 2.0 (RFC 6749 §3.3), and it lets equal requests share a cached token.
            string[] scopes =
            [
                .. value
                    .SelectMany(static scope =>
                        (scope ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
                    )
                    .Distinct(StringComparer.Ordinal)
                    .Order(StringComparer.Ordinal),
            ];

            if (scopes.Length == 0)
                throw new ArgumentException("At least one scope must be supplied.", nameof(Scopes));

            _scopes = scopes.AsReadOnly();
            _formattedScopes = string.Join(' ', scopes);
        }
    }

    /// <summary>
    /// <p><c>consumer_org</c>: the organization a supplier requests a token on behalf of.</p>
    /// <p>Required when acting as a supplier for an external consumer that has delegated the scope via Altinn.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument">the docs</a>.</p>
    /// </summary>
    public OrganizationNumber? ConsumerOrg
    {
        get => _consumerOrg;
        init => _consumerOrg = value is { } org ? OrganizationNumberGuard.Require(org, nameof(ConsumerOrg)) : null;
    }

    /// <summary>
    /// <p><c>resource</c>: audience-restricts the resulting token to a specific API (RFC 8707), which prevents
    /// token replay against other APIs sharing the same scope.</p>
    /// <p>The value is defined by the API owner and must be an absolute URI without a fragment.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_audience_restricted_tokens">the docs</a>.</p>
    /// </summary>
    /// <exception cref="ArgumentException">The supplied value is not an absolute URI, or carries a fragment.</exception>
    public string? Resource
    {
        get => _resource;
        init
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                _resource = null;
                return;
            }

            var trimmed = value.Trim();
            if (!Uri.IsWellFormedUriString(trimmed, UriKind.Absolute))
            {
                throw new ArgumentException(
                    $"The resource indicator must be an absolute URI, received: {trimmed}",
                    nameof(Resource)
                );
            }

            // Maskinporten rejects a resource carrying a fragment with `invalid_target`, so fail here
            // rather than on the round trip
            if (trimmed.Contains('#', StringComparison.Ordinal))
            {
                throw new ArgumentException(
                    $"The resource indicator must not contain a fragment, received: {trimmed}",
                    nameof(Resource)
                );
            }

            _resource = trimmed;
        }
    }

    /// <summary>
    /// <p><c>authorization_details</c>: requests a system user token on behalf of the given organization
    /// (RFC 9396 rich authorization requests).</p>
    /// <p>System user grants still carry <see cref="Scopes"/>, and only one party can be queried per token.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_systembruker">the docs</a>.</p>
    /// </summary>
    public MaskinportenSystemUser? SystemUser { get; init; }

    /// <summary>
    /// The normalized, space-delimited scope string, as expected by Maskinporten.
    /// </summary>
    internal string FormattedScopes => _formattedScopes;

    /// <summary>
    /// Renders the request as the claims of a JWT grant assertion. The envelope claims — issuer, audience,
    /// lifetime and <c>jti</c> — belong to whoever signs the assertion.
    /// </summary>
    internal Dictionary<string, object> ToClaims()
    {
        var claims = new Dictionary<string, object> { [JwtClaimTypes.Scope] = _formattedScopes };

        if (_consumerOrg is { } consumerOrg)
            claims[JwtClaimTypes.Maskinporten.ConsumerOrg] = consumerOrg.Get(OrganizationNumberFormat.Local);

        if (_resource is { } resource)
            claims[JwtClaimTypes.Maskinporten.Resource] = resource;

        // Always a single-entry array; only one party can be queried per token
        if (SystemUser is { } systemUser)
        {
            claims[JwtClaimTypes.Maskinporten.AuthorizationDetails] = new List<Dictionary<string, object>>
            {
                systemUser.ToAuthorizationDetail(),
            };
        }

        return claims;
    }

    /// <remarks>
    /// Declared explicitly because the synthesized record equality would compare <see cref="Scopes"/> by reference,
    /// making two otherwise identical requests unequal.
    /// </remarks>
    public bool Equals(MaskinportenTokenRequest? other) =>
        other is not null
        && string.Equals(_formattedScopes, other._formattedScopes, StringComparison.Ordinal)
        && Nullable.Equals(_consumerOrg, other._consumerOrg)
        && string.Equals(_resource, other._resource, StringComparison.Ordinal)
        && SystemUser == other.SystemUser;

    /// <inheritdoc/>
    public override int GetHashCode() => HashCode.Combine(_formattedScopes, _consumerOrg, _resource, SystemUser);
}

/// <summary>
/// Identifies the Altinn system user a token is requested for, as part of
/// <see cref="MaskinportenTokenRequest.SystemUser"/>.
/// </summary>
public sealed partial record MaskinportenSystemUser
{
    private readonly OrganizationNumber _organization;
    private readonly string? _externalRef;

    /// <summary>
    /// The organization (customer) that owns the system user. Sent in ISO 6523 format, e.g. <c>0192:991825827</c>.
    /// </summary>
    public required OrganizationNumber Organization
    {
        get => _organization;
        init => _organization = OrganizationNumberGuard.Require(value, nameof(Organization));
    }

    /// <summary>
    /// <p>Optional external reference, needed only when several system users for the same customer
    /// reference the same system.</p>
    /// <p>Limited to 255 characters from <c>a-z A-Z 0-9 ø Ø æ Æ å Å _ -</c>, as enforced by Maskinporten.
    /// Note that this value is not echoed back in the resulting token.</p>
    /// </summary>
    /// <exception cref="ArgumentException">The supplied value is too long or contains unsupported characters.</exception>
    public string? ExternalRef
    {
        get => _externalRef;
        init
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                _externalRef = null;
                return;
            }

            var trimmed = value.Trim();
            if (trimmed.Length > 255 || !ExternalRefPattern().IsMatch(trimmed))
            {
                throw new ArgumentException(
                    $"The external reference must be at most 255 characters from `a-z A-Z 0-9 ø Ø æ Æ å Å _ -`, received: {trimmed}",
                    nameof(ExternalRef)
                );
            }

            _externalRef = trimmed;
        }
    }

    /// <summary>
    /// Renders this system user as an <c>authorization_details</c> entry. Field names and casing are dictated by
    /// <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_systembruker">the docs</a>.
    /// </summary>
    internal Dictionary<string, object> ToAuthorizationDetail()
    {
        var detail = new Dictionary<string, object>
        {
            ["type"] = "urn:altinn:systemuser",
            ["systemuser_org"] = new Dictionary<string, object>
            {
                ["authority"] = "iso6523-actorid-upis",
                ["ID"] = _organization.Get(OrganizationNumberFormat.International),
            },
        };

        if (_externalRef is { } externalRef)
            detail["externalRef"] = externalRef;

        return detail;
    }

    /// <remarks>Mirrors the pattern Maskinporten validates against, which rejects anything else with `MP_302`.</remarks>
    [GeneratedRegex(@"^[a-zA-Z0-9øØæÆåÅ_\-]*$")]
    private static partial Regex ExternalRefPattern();
}

/// <summary>
/// <see cref="OrganizationNumber"/> is a struct, so <c>default</c> slips past both <c>required</c> and
/// nullability checks while holding no value at all. Fail loudly rather than emit an empty claim.
/// </summary>
file static class OrganizationNumberGuard
{
    internal static OrganizationNumber Require(OrganizationNumber value, string paramName)
    {
        if (string.IsNullOrEmpty(value.Get(OrganizationNumberFormat.Local)))
            throw new ArgumentException("A valid organization number is required.", paramName);

        return value;
    }
}
