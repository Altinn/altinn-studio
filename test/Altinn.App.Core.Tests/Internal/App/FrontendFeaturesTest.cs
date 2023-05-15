using Altinn.App.Core.Internal.App;
using FluentAssertions;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.App
{
    public class FrontendFeaturesTest
    {
        [Fact]
        public async void GetFeatures_returns_list_of_enabled_features()
        {
            Dictionary<string, bool> expected = new Dictionary<string, bool>()
            {
                { "footer", true },
                { "processActions", true },
            };
            IFrontendFeatures frontendFeatures = new FrontendFeatures();
            var actual = await frontendFeatures.GetFrontendFeatures();
            actual.Should().BeEquivalentTo(expected);
        }
    }
}
