#nullable disable
using Altinn.App.Core.Features.DataLists;
using Altinn.App.Core.Models;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.DataLists
{
    public class NullInstanceDataListProviderTest
    {
        [Fact]
        public async void Constructor_InitializedWithEmptyValues()
        {
            var provider = new NullInstanceDataListProvider();

            provider.Id.Should().Be(string.Empty);
            var options = await provider.GetInstanceDataListAsync(
                new InstanceIdentifier(12345, Guid.NewGuid()),
                "nb",
                new Dictionary<string, string>()
            );
            options.ListItems.Should().BeNull();
        }
    }
}
