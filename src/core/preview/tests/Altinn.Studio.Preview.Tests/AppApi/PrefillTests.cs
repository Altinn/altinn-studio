using System.Text.Json.Nodes;
using Altinn.Studio.Preview.AppApi;

namespace Altinn.Studio.Preview.Tests.AppApi;

public sealed class PrefillTests
{
    /// <summary>A data model as Studio makes them: a reference to a definition, with dashes in the XSD names.</summary>
    private static readonly JsonNode s_schema =
        JsonNode.Parse(
            """
            {
              "$ref": "#/$defs/Skjema",
              "$defs": {
                "Skjema": {
                  "type": "object",
                  "properties": {
                    "Innsender-grp-123": { "$ref": "#/$defs/Innsender" },
                    "partyId": { "type": "string" },
                    "mobil": { "type": ["integer", "null"] }
                  }
                },
                "Innsender": {
                  "type": "object",
                  "properties": {
                    "fornavn": { "type": "string" },
                    "navn": { "type": "string" }
                  }
                }
              }
            }
            """
        ) ?? throw new InvalidOperationException("No schema.");

    [Fact]
    public void Data_CopiesTheUsersData_IntoTheFieldsTheAppsModelNames()
    {
        JsonObject data = Prefill.Data(
            JsonNode.Parse(
                """
                {
                  "UserProfile": { "PartyId": "partyId", "Party.Person.FirstName": "innsender-grp-123.Fornavn" },
                  "DSF": { "MobileNumber": "Mobil" }
                }
                """
            ),
            s_schema
        );

        Assert.Equal(
            """{"partyId":"51001","Innsender-grp-123":{"fornavn":"Test"},"mobil":87654321}""",
            data.ToJsonString()
        );
    }

    [Theory]
    [InlineData(false, "Test Testesen")]
    [InlineData(true, "Testesen")]
    public void Data_KeepsTheFirstValue_UnlessTheConfigurationAllowsOverwriting(bool allowOverwrite, string name)
    {
        JsonObject data = Prefill.Data(
            JsonNode.Parse(
                $$"""
                {
                  "allowOverwrite": {{(allowOverwrite ? "true" : "false")}},
                  "UserProfile": { "Party.Name": "Innsender-grp-123.navn" },
                  "DSF": { "LastName": "Innsender-grp-123.navn" }
                }
                """
            ),
            s_schema
        );

        Assert.Equal(name, (string?)data["Innsender-grp-123"]?["navn"]);
    }

    [Fact]
    public void Data_LeavesOut_WhatTheAppCantCopy()
    {
        JsonObject data = Prefill.Data(
            JsonNode.Parse(
                """
                {
                  "ER": { "Name": "Innsender-grp-123.navn" },
                  "DSF": { "Unknown": "Innsender-grp-123.navn", "Name": "Innsender-grp-123.etternavn", "FirstName": "mobil" },
                  "UserProfile": { "party.name": "Innsender-grp-123.fornavn" }
                }
                """
            ),
            s_schema
        );

        Assert.Equal("{}", data.ToJsonString());
    }
}
