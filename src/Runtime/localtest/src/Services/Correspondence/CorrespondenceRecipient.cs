using System.Text.RegularExpressions;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Correspondence;

/// <summary>
/// A correspondence recipient, in one of the formats the Correspondence API accepts: an organization number as a
/// URN or with the <c>0192:</c> country code, a national identity number bare or as a URN, an ID-porten email URN,
/// or a legacy self-identified user URN.
/// </summary>
public sealed partial record CorrespondenceRecipient(string? OrganizationNumber, string? NationalIdentityNumber)
{
    internal const string OrganizationUrnPrefix = "urn:altinn:organization:identifier-no:";
    internal const string PersonUrnPrefix = "urn:altinn:person:identifier-no:";

    /// <summary>The message the Correspondence API answers a recipient in an unknown format with.</summary>
    internal const string InvalidFormatMessage =
        "Recipient should be an organization number in the format 'urn:altinn:organization:identifier-no:organizationnumber' "
        + "or the format countrycode:organizationnumber, for instance 0192:910753614, a national identity number, an "
        + "idporten email URN in the format 'urn:altinn:person:idporten-email:email', or a legacy selfidentified URN in "
        + "the format 'urn:altinn:person:legacy-selfidentified:username'";

    /// <summary>
    /// Whether the recipient is looked up in the register. A self-identified user, by email or username, is not.
    /// </summary>
    public bool IsRegisteredParty => OrganizationNumber is not null || NationalIdentityNumber is not null;

    /// <summary>The number the Correspondence API names the recipient by in its errors.</summary>
    public string? Number => OrganizationNumber ?? NationalIdentityNumber;

    /// <summary>
    /// Parses a recipient, or returns <c>null</c> when it is in none of the formats the Correspondence API accepts.
    /// </summary>
    public static CorrespondenceRecipient? TryParse(string recipient)
    {
        if (OrganizationPattern().Match(recipient) is { Success: true } organization)
        {
            return new CorrespondenceRecipient(organization.Groups["number"].Value, null);
        }
        if (PersonPattern().Match(recipient) is { Success: true } person)
        {
            return new CorrespondenceRecipient(null, person.Groups["number"].Value);
        }
        if (SelfIdentifiedPattern().IsMatch(recipient))
        {
            return new CorrespondenceRecipient(null, null);
        }
        return null;
    }

    /// <summary>The bare number of an organization or national identity number that may carry its URN prefix.</summary>
    internal static string? WithoutPrefix(string? identifier) =>
        identifier is null ? null
        : identifier.StartsWith(OrganizationUrnPrefix, StringComparison.OrdinalIgnoreCase)
            ? identifier[OrganizationUrnPrefix.Length..]
        : identifier.StartsWith(PersonUrnPrefix, StringComparison.OrdinalIgnoreCase) ? identifier[PersonUrnPrefix.Length..]
        : identifier;

    [GeneratedRegex(@"^(?:0192:|urn:altinn:organization:identifier-no:)(?<number>\d{9})$")]
    private static partial Regex OrganizationPattern();

    [GeneratedRegex(@"^(?:urn:altinn:person:identifier-no:)?(?<number>\d{11})$")]
    private static partial Regex PersonPattern();

    [GeneratedRegex(@"^(?:urn:altinn:person:idporten-email:.+|urn:altinn:person:legacy-selfidentified:[^:]+)$")]
    private static partial Regex SelfIdentifiedPattern();
}

/// <summary>
/// Whether a recipient is a party the register knows, as the Correspondence API checks before it creates anything.
/// </summary>
public interface ICorrespondenceRecipientRegister
{
    Task<bool> Exists(CorrespondenceRecipient recipient);
}

/// <summary>
/// Looks recipients up among the parties in the Localtest test data, which stands in for the register.
/// </summary>
public sealed class LocalCorrespondenceRecipientRegister(TestDataService testDataService)
    : ICorrespondenceRecipientRegister
{
    public async Task<bool> Exists(CorrespondenceRecipient recipient)
    {
        var parties = (await testDataService.GetTestData()).Register.Party.Values;
        return recipient.OrganizationNumber is { } organizationNumber
                ? parties.Any(party => party.OrgNumber == organizationNumber)
            : recipient.NationalIdentityNumber is { } nationalIdentityNumber
                ? parties.Any(party => party.SSN == nationalIdentityNumber)
            : true;
    }
}
