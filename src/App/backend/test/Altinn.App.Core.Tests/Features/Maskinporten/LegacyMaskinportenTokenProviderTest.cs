using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;
using Moq;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

public class LegacyMaskinportenTokenProviderTest
{
    private sealed record Fixture
    {
        public required LegacyMaskinportenTokenProvider TokenProvider { get; init; }
        public required Mock<IMaskinportenClient> MaskinportenClientMock { get; init; }

        public static JwtToken MaskinportenToken =>
            JwtToken.Parse(
                "eyJraWQiOiJiZFhMRVduRGpMSGpwRThPZnl5TUp4UlJLbVo3MUxCOHUxeUREbVBpdVQwIiwiYWxnIjoiUlMyNTYifQ.eyJzY29wZSI6ImFsdGlubjpyZXNvdXJjZXJlZ2lzdHJ5L3Jlc291cmNlLnJlYWQgYWx0aW5uOnNlcnZpY2Vvd25lciBhbHRpbm46Y29ycmVzcG9uZGVuY2Uud3JpdGUiLCJpc3MiOiJodHRwczovL3Rlc3QubWFza2lucG9ydGVuLm5vLyIsImNsaWVudF9hbXIiOiJwcml2YXRlX2tleV9qd3QiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzQwNTg0NDQxLCJpYXQiOjE3NDA1ODA4NDEsImNsaWVudF9pZCI6ImQyMjEzMGNmLTMzZjEtNGI2Yy1hMjM4LTVmMjZmZTk1NTRiMyIsImp0aSI6IjktVGs3VjloLVRPdTV3U09Dd1BPTEFFY3Jxd0MtYTFoZElfV1h2cXJhMEUiLCJjb25zdW1lciI6eyJhdXRob3JpdHkiOiJpc282NTIzLWFjdG9yaWQtdXBpcyIsIklEIjoiMDE5Mjo5OTE4MjU4MjcifX0.kucCO2tj2GdRhZQ09Drt39gcBRbFlCCD0_xiQQEhxOXUrJW93aGtVvFuSbtPHke6ndH-QVBEOMlKaovLp-8T2ZfoW3mjQ5NeZnkF4j-yN9sTv5baxFe6e2sVhSsQieC30KhPdJvYBYwU8reLY_JLmqLntL-VfOIUZz3Reh7FhDq-qXa8qvqWX1orN1GkQSSG8WoVzr7Gt7weNmqRRP9Wavfq0J-pbxT4CgQmHOFj0OkkqlrC-OCwD-Y9iqJgxJqlXgJapZljIfaxJeDyQiEDLCP_H-dTmDp1eOBwdLZDRx4TLJ45F0VXmwsIWGwdsvDpDCaL0t_GDfu61bfaDw7NFS4ZQnzTrbb53C55jSYEixQbEqX_vn4mCWzV0iPrBP_6B5x9QwVC3mhnSLuG77AgmA2h7ZmEHmVNtCu8WyvcUc-SbE9rg6wtRL9fycBBgqs61k_B2elDHImzKVSWyZVKQAIlj-eb0Hmspr380E4zTqBLJIvAiDZA0jBCGsNHlXPd"
            );
        public static JwtToken AltinnToken =>
            JwtToken.Parse(
                "eyJhbGciOiJSUzI1NiIsImtpZCI6IkQ4RDg2N0M3RDUyMTM2MEY0RjM1Q0Q1MTU4MEM0OUEwNTE2NUQ0RTEiLCJ4NXQiOiIyTmhueDlVaE5nOVBOYzFSV0F4Sm9GRmwxT0UiLCJ0eXAiOiJKV1QifQ.eyJzY29wZSI6ImFsdGlubjpyZXNvdXJjZXJlZ2lzdHJ5L3Jlc291cmNlLnJlYWQgYWx0aW5uOnNlcnZpY2Vvd25lciBhbHRpbm46Y29ycmVzcG9uZGVuY2Uud3JpdGUiLCJ0b2tlbl90eXBlIjoiQmVhcmVyIiwiZXhwIjoxNzQwNTgyNjU2LCJpYXQiOjE3NDA1ODA4NTYsImNsaWVudF9pZCI6ImQyMjEzMGNmLTMzZjEtNGI2Yy1hMjM4LTVmMjZmZTk1NTRiMyIsImNvbnN1bWVyIjp7ImF1dGhvcml0eSI6ImlzbzY1MjMtYWN0b3JpZC11cGlzIiwiSUQiOiIwMTkyOjk5MTgyNTgyNyJ9LCJ1cm46YWx0aW5uOm9yZyI6ImRpZ2RpciIsInVybjphbHRpbm46b3JnTnVtYmVyIjoiOTkxODI1ODI3IiwidXJuOmFsdGlubjphdXRoZW50aWNhdGVtZXRob2QiOiJtYXNraW5wb3J0ZW4iLCJ1cm46YWx0aW5uOmF1dGhsZXZlbCI6MywiaXNzIjoiaHR0cHM6Ly9wbGF0Zm9ybS50dDAyLmFsdGlubi5uby9hdXRoZW50aWNhdGlvbi9hcGkvdjEvb3BlbmlkLyIsImp0aSI6IjQyMGRkYmU4LWM0YjktNGY1MS05NDUxLTVhNjNmZjcyZGQ5NyIsIm5iZiI6MTc0MDU4MDg1Nn0.DQydmTFzbC21YmQ29LDg7qGmlmptX9Zwj_mvlZkol32LbpbOexeM5PC-hSaEYanuFxg5xZvfSYdoptk8GzznlINGe79bdD01g5RHxbsSrJ2SAuoK93oSDTVi0ncunz5UyG00PRimCvsTxj1CZ7r8JhL-C40nxGDQQM8fm-pAEyJtW6rehtg6EDfJCiQuCIqdxYFkM4vt0AKXS_ka-xQZcbEliZ5S7HD-RVeC4zWPdbqhA8BX0oQZwsTDma25vestv1D8YgoPe1Llu5ozSxfjh_Svp9rg7GroKGik0a6sCbP5zLcRcgAOd9lzcDDvDfksrNNJ5KPeL2XNCkyVPbiDTw"
            );

        public static Fixture Create()
        {
            var maskinportenClientMock = new Mock<IMaskinportenClient>();
            var tokenProvider = new LegacyMaskinportenTokenProvider(maskinportenClientMock.Object);

            maskinportenClientMock
                .Setup(x => x.GetAccessToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(MaskinportenToken);

            maskinportenClientMock
                .Setup(x => x.GetAltinnExchangedToken(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(AltinnToken);

            return new Fixture { TokenProvider = tokenProvider, MaskinportenClientMock = maskinportenClientMock };
        }
    }

    [Fact]
    public async Task GetToken_CallsMaskinportenClientCorrectly()
    {
        // Arrange
        var fixture = Fixture.Create();
        var scopes = "test1 test2";

        // Act
        var token = await fixture.TokenProvider.GetToken(scopes);

        // Assert
        Assert.Equal(Fixture.MaskinportenToken.Value, token);
        fixture.MaskinportenClientMock.Verify(
            x => x.GetAccessToken(new[] { scopes }, It.IsAny<CancellationToken>()),
            Times.Once
        );
        fixture.MaskinportenClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task GetAltinnExchangedToken_CallsMaskinportenClientCorrectly()
    {
        // Arrange
        var fixture = Fixture.Create();
        var scopes = "test";

        // Act
        var token = await fixture.TokenProvider.GetAltinnExchangedToken(scopes);

        // Assert
        Assert.Equal(Fixture.AltinnToken.Value, token);
        fixture.MaskinportenClientMock.Verify(
            x => x.GetAltinnExchangedToken(new[] { scopes }, It.IsAny<CancellationToken>()),
            Times.Once
        );
        fixture.MaskinportenClientMock.VerifyNoOtherCalls();
    }
}
