using FluentAssertions;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Codelists.Tests.Countries.Clients
{
    public class CountriesClientTests
    {
        [Fact]
        public async Task GetAllCountries_ShouldReturnAll()
        {
            var countriesClient = new CountriesClient();

            var countries = await countriesClient.GetAllCountries();

            countries.Should().HaveCount(250);
        }
    }
}
