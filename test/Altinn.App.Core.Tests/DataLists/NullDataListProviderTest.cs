#nullable disable
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Internal.Language;
using FluentAssertions;

namespace Altinn.App.PlatformServices.Tests.DataLists;

public class NullDataListProviderTest
{
    [Fact]
    public async Task Constructor_InitializedWithEmptyValues()
    {
        var provider = new NullDataListProvider();

        provider.Id.Should().Be(string.Empty);
        var list = await provider.GetDataListAsync(LanguageConst.Nb, new Dictionary<string, string>());
        list.ListItems.Should().BeNull();
    }
}
