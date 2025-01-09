namespace Altinn.App.Core.Constants;

/// <summary>
/// Altinn specific URNs
/// </summary>
/// <remarks>
/// Most often found in authentication tokens and xacml policy files,
/// but also observed in the wild (e.g. correspondence api response).
/// </remarks>
internal static class AltinnUrns
{
    public const string Org = "urn:altinn:org";
    public const string OrgNumber = "urn:altinn:orgno";
    public const string OrganisationNumber = "urn:altinn:organization:identifier-no";
    public const string LegacyOrganizationNumber = "urn:altinn:organizationnumber";
    public const string PersonId = "urn:altinn:person:identifier-no";
    public const string UserId = "urn:altinn:userid";
    public const string UserName = "urn:altinn:username";
    public const string PartyId = "urn:altinn:partyid";
    public const string RepresentingPartyId = "urn:altinn:representingpartyid";
    public const string App = "urn:altinn:app";
    public const string AppResource = "urn:altinn:appresource";
    public const string AuthenticationLevel = "urn:altinn:authlevel";
    public const string MinimumAuthenticationLevel = "urn:altinn:minimum-authenticationlevel";
    public const string AuthenticationMethod = "urn:altinn:authenticatemethod";
    public const string RoleCode = "urn:altinn:rolecode";
    public const string OedRoleCode = "urn:digitaltdodsbo:rolecode";
    public const string InstanceId = "urn:altinn:instance-id";
    public const string Task = "urn:altinn:task";
    public const string EndEvent = "urn:altinn:end-event";
    public const string Resource = "urn:altinn:resource";
    public const string Developer = "urn:altinn:developer";
    public const string DeveloperToken = "urn:altinn:developertoken";
    public const string DeveloperTokenId = "urn:altinn:developertokenid";
}
