using System.Globalization;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The user who uses the app in preview, and the party they act for. They are the same ones Designer's preview used,
/// and Studio's frontend links to instances of <see cref="PartyId"/>.
/// </summary>
internal static class MockUser
{
    public const int PartyId = 51001;
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

    public static string Id => UserId.ToString(CultureInfo.InvariantCulture);

    /// <summary>The party, as the app frontend's <c>IParty</c>.</summary>
    public static JsonObject Party()
    {
        JsonObject party = Party(PartyId);
        party["onlyHierarchyElementWithNoAccess"] = false;
        return party;
    }

    public static JsonObject Party(int partyId) =>
        new()
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
            ["party"] = Party(),
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
                ["Person"] = PersonForPrefill(),
                ["Organization"] = null,
            },
            ["ProfileSettingPreference"] = new JsonObject
            {
                ["Language"] = "nb",
                ["PreSelectedPartyId"] = 0,
                ["DoNotPromptForParty"] = true,
            },
        };

    /// <summary>The person, as the national register has them, with the names the app library's prefill reads.</summary>
    public static JsonObject PersonForPrefill() =>
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
