using Altinn.App.Clients.Fiks.Extensions;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivInstanceClientTest
{
    [Fact]
    public async Task GetServiceOwnerToken_CallsTokenResolver()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
        });

        // Act
        var result = await fixture.FiksArkivInstanceClient.GetServiceOwnerToken();

        // Assert
        Assert.Equal(TestHelpers.DummyToken, result.Value);
    }
}
