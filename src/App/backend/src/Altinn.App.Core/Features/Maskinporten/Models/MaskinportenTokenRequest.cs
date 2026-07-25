using System.Collections.ObjectModel;
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
///     ConsumerOrg = OrganisationNumber.Parse("991825827"),
/// };
/// </code>
/// </example>
public sealed record MaskinportenTokenRequest
{
    private readonly ReadOnlyCollection<string> _scopes = ReadOnlyCollection<string>.Empty;
    private readonly string _formattedScopes = string.Empty;
    private readonly OrganisationNumber? _consumerOrg;
    private readonly string? _resource;

    /// <summary>
    /// <p>The scopes to claim authorization for with Maskinporten. At least one scope is required.</p>
    /// <p>Entries are split on whitespace, de-duplicated and ordered, so both <c>["a", "b"]</c> and
    /// <c>["a b"]</c> are accepted, and requests differing only in scope ordering share a cached token.
    /// Scope order carries no meaning in OAuth 2.0 (RFC 6749 §3.3).</p>
    /// </summary>
    /// <exception cref="ArgumentException">No usable scope was supplied.</exception>
    public required IEnumerable<string> Scopes
    {
        get => _scopes;
        init
        {
            ArgumentNullException.ThrowIfNull(value, nameof(Scopes));

            // A null separator array makes `Split` break on any whitespace, which also means no fragment
            // it produces can have whitespace of its own to trim
            string[] scopes =
            [
                .. value
                    .SelectMany(static scope =>
                        (scope ?? string.Empty).Split(_whitespaceSeparators, StringSplitOptions.RemoveEmptyEntries)
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
    /// <p><c>consumer_org</c>: the organisation a supplier requests a token on behalf of.</p>
    /// <p>Required when acting as a supplier for an external consumer that has delegated the scope via Altinn.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument">the docs</a>.</p>
    /// </summary>
    public OrganisationNumber? ConsumerOrg
    {
        get => _consumerOrg;
        init => _consumerOrg = value is { } org ? OrganisationNumberGuard.Require(org, nameof(ConsumerOrg)) : null;
    }

    /// <summary>
    /// <p><c>resource</c>: audience-restricts the resulting token to a specific API (RFC 8707), which prevents
    /// token replay against other APIs sharing the same scope.</p>
    /// <p>The value is defined by the API owner and must be an absolute URI.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_audience_restricted_tokens">the docs</a>.</p>
    /// </summary>
    /// <exception cref="ArgumentException">The supplied value is not an absolute URI.</exception>
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

            _resource = trimmed;
        }
    }

    /// <summary>
    /// <p><c>authorization_details</c>: requests a system user token on behalf of the given organisation
    /// (RFC 9396 rich authorization requests).</p>
    /// <p>System user grants still carry <see cref="Scopes"/>, and only one party can be queried per token.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_systembruker">the docs</a>.</p>
    /// </summary>
    public MaskinportenSystemUser? SystemUser { get; init; }

    /// <summary>
    /// The normalised, space-delimited scope string, as expected by Maskinporten.
    /// </summary>
    internal string FormattedScopes => _formattedScopes;

    /// <remarks>
    /// Declared explicitly because the synthesised record equality would compare <see cref="Scopes"/> by reference,
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

    private static readonly char[]? _whitespaceSeparators = null;
}

/// <summary>
/// Identifies the Altinn system user a token is requested for, as part of
/// <see cref="MaskinportenTokenRequest.SystemUser"/>.
/// </summary>
public sealed record MaskinportenSystemUser
{
    private readonly OrganisationNumber _organisation;
    private readonly string? _externalRef;

    /// <summary>
    /// The organisation (customer) that owns the system user. Sent in ISO 6523 format, e.g. <c>0192:991825827</c>.
    /// </summary>
    public required OrganisationNumber Organisation
    {
        get => _organisation;
        init => _organisation = OrganisationNumberGuard.Require(value, nameof(Organisation));
    }

    /// <summary>
    /// <p>Optional external reference, needed only when several system users for the same customer
    /// reference the same system.</p>
    /// <p>Note that this value is not echoed back in the resulting token.</p>
    /// </summary>
    public string? ExternalRef
    {
        get => _externalRef;
        init => _externalRef = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

/// <summary>
/// <see cref="OrganisationNumber"/> is a struct, so <c>default</c> slips past both <c>required</c> and
/// nullability checks while holding no value at all. Fail loudly rather than emit an empty claim.
/// </summary>
file static class OrganisationNumberGuard
{
    internal static OrganisationNumber Require(OrganisationNumber value, string paramName)
    {
        if (string.IsNullOrEmpty(value.Get(OrganisationNumberFormat.Local)))
            throw new ArgumentException("A valid organisation number is required.", paramName);

        return value;
    }
}
