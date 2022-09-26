using Altinn.App.Core.Features;
using Altinn.Codelists.AdministrativeUnits;
using Altinn.Codelists.Tests.AdministrativeUnits.Mocks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Codelists.Tests.AdministrativeUnits
{
    public class CountiesCodelistProviderTests
    {
        [Fact]
        public async Task GetAppOptionsAsync_ShouldReturnListOfCounties()
        {
            var administrativeUnitsHttpClientMock = new AdministrativeUnitsHttpClientMock(Options.Create(new AdministrativeUnitsOptions()));
            IAppOptionsProvider appOptionsProvider = new CountiesCodelistProvider(administrativeUnitsHttpClientMock);
            
            var appOptions = await appOptionsProvider.GetAppOptionsAsync("nb", new Dictionary<string, string>());

            appOptions.Options.Should().HaveCount(11);
            appOptions.Options.First(x => x.Value == "46").Label.Should().Be("Vestland");
        }
    }
}
