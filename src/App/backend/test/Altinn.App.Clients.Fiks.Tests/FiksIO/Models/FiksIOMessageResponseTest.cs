using Altinn.App.Clients.Fiks.FiksIO.Models;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Send.Client.Models;

namespace Altinn.App.Clients.Fiks.Tests.FiksIO.Models;

public class FiksIOMessageResponseTest
{
    [Fact]
    public void Properties_AreMappedCorrectly()
    {
        // Arrange
        var sendtMelding = SendtMelding.FromSentMessageApiModel(
            new SendtMeldingApiModel
            {
                MeldingId = Guid.Parse("83b8a6eb-fe8b-40e1-a8f7-2baf9028cae0"),
                MeldingType = "the-message-type",
                AvsenderKontoId = Guid.Parse("c99dc7b9-2055-4fe4-88e1-f09b65ddda7e"),
                MottakerKontoId = Guid.Parse("23031d6c-fc37-4325-8f76-1a9fc676f2c0"),
                Ttl = (int)TimeSpan.FromHours(1).TotalMilliseconds,
                Headere = new Dictionary<string, string>
                {
                    [MeldingBase.HeaderKlientKorrelasjonsId] = "dGVzdA==", // base64-encoded
                    [MeldingBase.HeaderKlientMeldingId] = "df7d5441-b050-4e60-b8b6-950b72bcf1b3",
                },
                SvarPaMelding = Guid.Parse("797800b1-8e34-4834-8646-c8a4544dc1ed"),
            }
        );
        var messageResponse = new FiksIOMessageResponse(sendtMelding);

        // Act & Assert
        Assert.Equal("83b8a6eb-fe8b-40e1-a8f7-2baf9028cae0", messageResponse.MessageId.ToString());
        Assert.Equal("df7d5441-b050-4e60-b8b6-950b72bcf1b3", messageResponse.SendersReference.ToString());
        Assert.Equal("test", messageResponse.CorrelationId); // base64-decoded
        Assert.Equal("the-message-type", messageResponse.MessageType);
        Assert.Equal("c99dc7b9-2055-4fe4-88e1-f09b65ddda7e", messageResponse.Sender.ToString());
        Assert.Equal("23031d6c-fc37-4325-8f76-1a9fc676f2c0", messageResponse.Recipient.ToString());
        Assert.Equal(TimeSpan.FromHours(1), messageResponse.MessageLifetime);
        Assert.Equal("797800b1-8e34-4834-8646-c8a4544dc1ed", messageResponse.InReplyToMessage.ToString());
    }
}
