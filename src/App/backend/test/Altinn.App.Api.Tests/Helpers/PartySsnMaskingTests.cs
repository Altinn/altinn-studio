using Altinn.App.Api.Helpers;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Tests.Helpers;

public class PartySsnMaskingTests
{
    [Fact]
    public void MaskParty_MasksSsnOnParty_Person_AndChildParties()
    {
        var party = new Party
        {
            PartyId = 1,
            PartyTypeName = PartyType.Person,
            Name = "Ola Nordmann",
            SSN = "12345678901",
            Person = new Person { SSN = "12345678901", Name = "Ola Nordmann" },
            ChildParties = new List<Party>
            {
                new()
                {
                    PartyId = 2,
                    Name = "Kari Nordmann",
                    SSN = "10987654321",
                },
            },
        };

        Party masked = PartySsnMasking.MaskParty(party);

        Assert.Equal("123456*****", masked.SSN);
        Assert.Equal("123456*****", masked.Person.SSN);
        Assert.Equal("109876*****", masked.ChildParties[0].SSN);

        // Non-SSN fields are copied unchanged.
        Assert.Equal("Ola Nordmann", masked.Name);
        Assert.Equal("Ola Nordmann", masked.Person.Name);
        Assert.Equal("Kari Nordmann", masked.ChildParties[0].Name);
        Assert.Equal(PartyType.Person, masked.PartyTypeName);
    }

    [Fact]
    public void MaskParty_DoesNotMutateTheSourceParty()
    {
        var party = new Party
        {
            SSN = "12345678901",
            Person = new Person { SSN = "12345678901" },
        };

        Party masked = PartySsnMasking.MaskParty(party);

        // The masking returns a copy; the original object keeps its full SSN.
        Assert.Equal("12345678901", party.SSN);
        Assert.Equal("12345678901", party.Person.SSN);
        Assert.NotSame(party, masked);
        Assert.NotSame(party.Person, masked.Person);
    }

    [Fact]
    public void MaskParty_LeavesOrganisationFieldsIntact()
    {
        var party = new Party
        {
            PartyTypeName = PartyType.Organisation,
            Name = "Acme AS",
            OrgNumber = "987654321",
            SSN = null,
        };

        Party masked = PartySsnMasking.MaskParty(party);

        Assert.Null(masked.SSN);
        Assert.Equal("987654321", masked.OrgNumber);
        Assert.Equal("Acme AS", masked.Name);
    }

    [Fact]
    public void MaskParties_MasksEveryPartyInTheList()
    {
        var parties = new List<Party>
        {
            new() { PartyId = 1, SSN = "12345678901" },
            new() { PartyId = 2, SSN = "10987654321" },
        };

        List<Party> masked = PartySsnMasking.MaskParties(parties);

        Assert.Equal("123456*****", masked[0].SSN);
        Assert.Equal("109876*****", masked[1].SSN);
    }

    [Fact]
    public void MaskUserProfile_MasksSsnOnTheNestedParty_AndKeepsOtherFields()
    {
        var profile = new UserProfile
        {
            UserId = 2029633,
            Email = "nullstilt@altinn.xyz",
            PartyId = 51005394,
            Party = new Party
            {
                PartyId = 51005394,
                PartyTypeName = PartyType.Person,
                Name = "GRENSE TROVERDIG",
                SSN = "26917699894",
                Person = new Person { SSN = "26917699894", Name = "GRENSE TROVERDIG" },
            },
        };

        UserProfile masked = PartySsnMasking.MaskUserProfile(profile);

        Assert.Equal("269176*****", masked.Party.SSN);
        Assert.Equal("269176*****", masked.Party.Person.SSN);

        // Non-SSN fields are copied unchanged.
        Assert.Equal(2029633, masked.UserId);
        Assert.Equal("nullstilt@altinn.xyz", masked.Email);
        Assert.Equal(51005394, masked.PartyId);
        Assert.Equal("GRENSE TROVERDIG", masked.Party.Name);

        // The masking returns copies; the original keeps its full SSN.
        Assert.Equal("26917699894", profile.Party.SSN);
        Assert.NotSame(profile, masked);
        Assert.NotSame(profile.Party, masked.Party);
    }
}
