using Altinn.Codelists.Countries.Data;
using Altinn.Codelists.Countries.Models;
using Altinn.Codelists.Utilities;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text.Json;
using static Microsoft.Extensions.Logging.EventSource.LoggingEventSource;

namespace Altinn.Codelists
{
    /// <summary>
    /// Client to get information on all countries of the world.
    /// Note that this is not an http client but uses a static json embedded within
    /// this dll to resolve the the list of countries.
    /// </summary>
    public class CountriesClient : ICountryClient
    {
        /// <summary>
        /// Sends a asynchronus internal request to get all the countries of the world.
        /// </summary>
        public async Task<List<Country>> GetCountries()
        {
            var filters = new List<Filter>();
         
            return await GetCountries(filters);
        }

        /// <summary>
        /// Sends a asynchronus internal request to get all countries of the world,
        /// matching the specified filters.
        /// Values within the same filter object are AND'ed,
        /// while values between filter objects are OR'ed.
        /// </summary>
        public async Task<List<Country>> GetCountries(IEnumerable<Filter> filters)
        {
            string json = await EmbeddedResource.LoadDataAsString(Resources.CountriesJson);
            var countries = JsonSerializer.Deserialize<List<Country>>(json) ?? new List<Country>();

            IQueryable<Country> query = BuildQuery(countries, filters);

            return query.ToList();
        }

        private static IQueryable<Country> BuildQuery(IEnumerable<Country> countries, IEnumerable<Filter> filters)
        {
            var query = countries.AsQueryable();

            var predicate = PredicateBuilder.False<Country>();

            foreach (var filter in filters)
            {
                var subPredicate = PredicateBuilder.True<Country>();
                if (!filter.Region.IsNullOrEmpty())
                {
                    subPredicate = subPredicate.And(c => c.Region.Equals(filter.Region));
                }

                if (!filter.SubRegion.IsNullOrEmpty())
                {
                    subPredicate = subPredicate.And(c => c.SubRegion.Equals(filter.SubRegion));
                }

                predicate = predicate.Or(subPredicate);
            }

            return query.Where(predicate);
        }
    }
}