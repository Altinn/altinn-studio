using System.Globalization;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The user who uses the app in preview, and the parties they can act for: themself, as the same person Designer's
/// preview used, or an organization. Each session acts for one of them, which Studio chooses.
/// </summary>
internal static class MockUser
{
    /// <summary>The user's own party. Studio's frontend links to instances of it.</summary>
    public const int PartyId = 51001;

    /// <summary>The organization's party.</summary>
    public const int OrganizationPartyId = 51002;

    public const int UserId = 1024;
    private const string Name = "Test Testesen";
    private const string UserName = "previewUser";
    private const string Email = "testesen@example.com";
    private const string MobileNumber = "87654321";

    /// <summary>
    /// A synthetic national identity number, as the national register's test data has them: the month is 80 higher
    /// than a real one, so no real person has it.
    /// </summary>
    private const string Ssn = "17858940095";

    private const string OrganizationName = "Testbedrift AS";

    /// <summary>A synthetic organization number, which starts with 3, as in the register's test data.</summary>
    private const string OrgNumber = "314752007";

    public static string Id => UserId.ToString(CultureInfo.InvariantCulture);

    /// <summary>The party the user acts for, as the app frontend's <c>IParty</c>.</summary>
    public static JsonObject SelectedParty(int partyId)
    {
        JsonObject party = Party(partyId);
        party["onlyHierarchyElementWithNoAccess"] = false;
        return party;
    }

    /// <summary>A party, as an instance's owner names it: the organization, or else the person.</summary>
    public static JsonObject Party(int partyId) =>
        partyId == OrganizationPartyId
            ? new()
            {
                ["partyId"] = partyId,
                ["partyUuid"] = null,
                ["partyTypeName"] = 2, // Organization
                ["ssn"] = null,
                ["orgNumber"] = OrgNumber,
                ["unitType"] = "AS",
                ["name"] = OrganizationName,
                ["isDeleted"] = false,
            }
            : new()
            {
                ["partyId"] = partyId,
                ["partyUuid"] = null,
                ["partyTypeName"] = 1, // Person
                ["ssn"] = Ssn,
                ["orgNumber"] = null,
                ["unitType"] = null,
                ["name"] = Name,
                ["isDeleted"] = false,
            };

    public static string? PersonNumber(int partyId) => partyId == OrganizationPartyId ? null : Ssn;

    public static string? OrganizationNumber(int partyId) => partyId == OrganizationPartyId ? OrgNumber : null;

    public static JsonObject PartyTypesThatLetAnyPartyIn() =>
        new()
        {
            ["bankruptcyEstate"] = false,
            ["organisation"] = false,
            ["person"] = false,
            ["subUnit"] = false,
        };

    /// <summary>The user, as the app frontend's <c>IProfile</c>.</summary>
    public static JsonObject Profile(string language) =>
        new()
        {
            ["userId"] = UserId,
            ["userName"] = UserName,
            ["phoneNumber"] = MobileNumber,
            ["email"] = Email,
            ["partyId"] = PartyId,
            ["party"] = SelectedParty(PartyId),
            ["userType"] = 1,
            ["profileSettingPreference"] = new JsonObject
            {
                ["language"] = language,
                ["preSelectedPartyId"] = 0,
                ["doNotPromptForParty"] = true,
            },
        };

    /// <summary>
    /// The user's profile, with the names the app library's prefill reads in it, as <c>UserProfile.Party.Name</c>.
    /// </summary>
    public static JsonObject ProfileForPrefill() =>
        new()
        {
            ["UserId"] = UserId,
            ["UserName"] = UserName,
            ["PhoneNumber"] = MobileNumber,
            ["Email"] = Email,
            ["PartyId"] = PartyId,
            ["UserType"] = 1,
            ["Party"] = new JsonObject
            {
                ["PartyId"] = PartyId,
                ["PartyTypeName"] = 1, // Person
                ["OrgNumber"] = null,
                ["SSN"] = Ssn,
                ["UnitType"] = null,
                ["Name"] = Name,
                ["IsDeleted"] = false,
                ["OnlyHierarchyElementWithNoAccess"] = false,
                ["Person"] = Person(),
                ["Organization"] = null,
            },
            ["ProfileSettingPreference"] = new JsonObject
            {
                ["Language"] = "nb",
                ["PreSelectedPartyId"] = 0,
                ["DoNotPromptForParty"] = true,
            },
        };

    /// <summary>
    /// The person a party is, as the national register has them, with the names the app library's prefill reads.
    /// <c>null</c> for the organization.
    /// </summary>
    public static JsonObject? PersonForPrefill(int partyId) => partyId == OrganizationPartyId ? null : Person();

    /// <summary>
    /// The organization a party is, as the organization register has it, with the names the app library's prefill
    /// reads. <c>null</c> for the person.
    /// </summary>
    public static JsonObject? OrganizationForPrefill(int partyId) =>
        partyId == OrganizationPartyId
            ? new()
            {
                ["OrgNumber"] = OrgNumber,
                ["Name"] = OrganizationName,
                ["UnitType"] = "AS",
                ["TelephoneNumber"] = "22222222",
                ["MobileNumber"] = "99999999",
                ["FaxNumber"] = null,
                ["EMailAddress"] = "post@example.com",
                ["InternetAddress"] = "https://example.com",
                ["MailingAddress"] = "Postboks 1 0101 Oslo",
                ["MailingPostalCode"] = "0101",
                ["MailingPostalCity"] = "Oslo",
                ["BusinessAddress"] = "Testgata 2 0150 Oslo",
                ["BusinessPostalCode"] = "0150",
                ["BusinessPostalCity"] = "Oslo",
            }
            : null;

    private static JsonObject Person() =>
        new()
        {
            ["SSN"] = Ssn,
            ["Name"] = Name,
            ["FirstName"] = "Test",
            ["MiddleName"] = null,
            ["LastName"] = "Testesen",
            ["TelephoneNumber"] = "12345678",
            ["MobileNumber"] = MobileNumber,
            ["MailingAddress"] = "Testveien 1 0150 Oslo",
            ["MailingPostalCode"] = "0150",
            ["MailingPostalCity"] = "Oslo",
            ["AddressMunicipalNumber"] = "0301",
            ["AddressMunicipalName"] = "Oslo",
            ["AddressStreetName"] = "Testveien",
            ["AddressHouseNumber"] = "1",
            ["AddressHouseLetter"] = null,
            ["AddressPostalCode"] = "0150",
            ["AddressCity"] = "Oslo",
        };
}
