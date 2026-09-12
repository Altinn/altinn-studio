using System.Xml.Serialization;
using Altinn.App.Core.Models;
using Xunit;

namespace Altinn.App.Core.Tests.Models;

public class PartyXmlSerializationTests
{
    [Fact]
    public void Party_with_populated_ChildParties_round_trips_through_XmlSerializer()
    {
        // ASP.NET Core's AddXmlSerializerFormatters() uses System.Xml.Serialization.XmlSerializer,
        // which requires collection properties to be mutable/Add-able. Party.ChildParties must stay
        // List<Party> (not IReadOnlyList<Party>) for the API's XML-format responses to keep working.
        var party = new Party
        {
            PartyId = 1,
            PartyUuid = Guid.NewGuid(),
            PartyTypeName = PartyType.Person,
            Name = "Test Testesen",
            Person = new Person { Name = "Test Testesen", SSN = "01019012345" },
            ChildParties =
            [
                new Party
                {
                    PartyId = 2,
                    PartyUuid = Guid.NewGuid(),
                    PartyTypeName = PartyType.Organisation,
                    Name = "Child Org",
                },
            ],
        };

        var serializer = new XmlSerializer(typeof(Party));
        using var stream = new MemoryStream();
        serializer.Serialize(stream, party);

        stream.Position = 0;
        var roundTripped = Assert.IsType<Party>(serializer.Deserialize(stream));

        Assert.Equal(party.PartyId, roundTripped.PartyId);
        Assert.NotNull(roundTripped.ChildParties);
        Assert.Single(roundTripped.ChildParties);
        Assert.Equal(2, roundTripped.ChildParties[0].PartyId);
    }
}
