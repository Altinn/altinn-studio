using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Features.Options;

public class NullInstanceAppOptionsProviderTests
{
    [Fact]
    public async Task Constructor_InitializedWithEmptyValues()
    {
        var provider = new NullInstanceAppOptionsProvider();

        provider.Id.Should().Be(string.Empty);
        var options = await provider.GetInstanceAppOptionsAsync(
            new InstanceIdentifier(12345, Guid.NewGuid()),
            LanguageConst.Nb,
            new Dictionary<string, string>()
        );
        options.Options.Should().BeNull();
    }
}
