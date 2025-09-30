#nullable disable
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.DataLists;

public class NullInstanceDataListProviderTest
{
    [Fact]
    public async Task Constructor_InitializedWithEmptyValues()
    {
        var provider = new NullInstanceDataListProvider();

        provider.Id.Should().Be(string.Empty);
        var options = await provider.GetInstanceDataListAsync(
            new InstanceIdentifier(12345, Guid.NewGuid()),
            LanguageConst.Nb,
            new Dictionary<string, string>()
        );
        options.ListItems.Should().BeNull();
    }
}
