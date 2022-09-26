using Altinn.Codelists.Countries.Models;
using FluentAssertions;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.Codelists.Tests.Countries.Clients
{
    public class CountriesClientTests
    {
        private readonly ITestOutputHelper _output;

        public CountriesClientTests(ITestOutputHelper outputHelper)
        {
            _output = outputHelper;
        }

        [Fact]
        public async Task GetCountries_NoFilter_ShouldReturnAll()
        {
            var countriesClient = new CountriesClient();

            var countries = await countriesClient.GetCountries();

            countries.Should().HaveCount(250);
        }

        [Fact]
        public async Task GetCountries_FilterOnRegion_ShouldReturnOnlyInRegion()
        {
            var countriesClient = new CountriesClient();

            var countries = await countriesClient.GetCountries(new List<Filter>() { new Filter() { Region = "Europe" } });

            countries.Should().HaveCount(53);
        }

        [Fact]
        public async Task GetCountries_FilterOnMultipleRegions_ShouldReturnOnlyInRegions()
        {
            var countriesClient = new CountriesClient();

            var countries = await countriesClient.GetCountries(new List<Filter>() { new Filter() { Region = "Europe" }, new Filter() { Region = "Asia", SubRegion = "Eastern Asia" } });

            countries.Should().HaveCount(61);

            countries.ForEach(c => { _output.WriteLine(c.Name.Common); });
        }
    }
}
