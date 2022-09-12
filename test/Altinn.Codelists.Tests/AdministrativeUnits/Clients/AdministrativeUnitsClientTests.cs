using Altinn.Codelists.AdministrativeUnits;
using FluentAssertions;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Codelists.Tests.AdministrativeUnits.Clients
{
    public class AdministrativeUnitsClientTests
    {
        [Fact(Skip = "This actually calls out to the api and is primarily used to test during development.")]
        public async Task GetCounties_NothingSpecified_ShouldReturnAllCounties()
        {
            var client = new AdministrativeUnitsHttpClient(Options.Create(new AdministrativeUnitsOptions()), new HttpClient());

            var counties = await client.GetCounties();

            counties.Should().HaveCountGreaterThan(2);
        }

        [Fact(Skip = "This actually calls out to the api and is primarily used to test during development.")]
        public async Task GetCommunes_NothingSpecified_ShouldReturnAllCommunes()
        {
            var client = new AdministrativeUnitsHttpClient(Options.Create(new AdministrativeUnitsOptions()), new HttpClient());

            var communes = await client.GetCommunes();

            communes.Should().HaveCountGreaterThan(2);
        }

        [Fact(Skip = "This actually calls out to the api and is primarily used to test during development.")]
        public async Task GetCommunes_CountySpecified_ShouldReturnCommunesWithinCounty()
        {
            var client = new AdministrativeUnitsHttpClient(Options.Create(new AdministrativeUnitsOptions()), new HttpClient());

            var communes = await client.GetCommunes("46");

            communes.Should().HaveCountGreaterThan(2);
        }
    }
}