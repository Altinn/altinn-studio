using Altinn.App.Core.Extensions;
using Altinn.App.Core.Internal.Maskinporten;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Tests.Internal.Maskinporten;

public class MaskinportenExtensionsTests
{
    [Fact]
    public void AddMaskinportenJwkTokenProvider_ShouldAddService()
    {
        IServiceCollection services = new ServiceCollection();
        services.AddMaskinportenJwkTokenProvider("nameOfJwkSecretInKeyVault");

        services.IsAdded(typeof(IMaskinportenTokenProvider)).Should().BeTrue();
    }
}
