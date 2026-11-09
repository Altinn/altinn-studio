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

    /// <summary>The party, as the app frontend's <c>IParty</c>.</summary>
    public static JsonObject Party() =>
        new()
        {
            ["partyId"] = PartyId,
            ["partyTypeName"] = 1, // Person
            ["ssn"] = null,
            ["orgNumber"] = null,
            ["name"] = "Test Testesen",
            ["isDeleted"] = false,
            ["onlyHierarchyElementWithNoAccess"] = false,
        };

    /// <summary>The user, as the app frontend's <c>IProfile</c>.</summary>
    public static JsonObject Profile(string language) =>
        new()
        {
            ["userId"] = UserId,
            ["userName"] = "previewUser",
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
}
