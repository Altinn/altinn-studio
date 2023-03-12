using Altinn.App.Core.Features;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Codelists.Tests.Posten.Mocks;
using Altinn.Codelists.Posten;

namespace Altinn.Codelists.Tests.Posten
{
    public class PostalCodesCodelistProviderTests
    {
        [Fact]
        public async Task GetAppOptionsAsync_ShouldReturnListOfCodes()
        {
            var httpClientMock = new PostalCodesHttpClientMock();
            IAppOptionsProvider appOptionsProvider = new PostalCodesCodelistsProvider(httpClientMock);

            var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

            appOptions.Options.Should().HaveCount(5139);
            appOptions.Options.First(x => x.Value == "6863").Label.Should().Be("LEIKANGER");
        }
    }
}
