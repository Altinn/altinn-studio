using Altinn.Codelists.RestCountries.Data;
using Altinn.Codelists.RestCountries.Models;
using Altinn.Codelists.Utilities;

namespace Altinn.Codelists.RestCountries.Clients;

/// <summary>
/// Client to get information on all countries of the world.
/// Note that this is not an http client but uses a static json embedded within
/// this dll to resolve the the list of countries.
/// </summary>
internal sealed class CountriesClient : ICountryClient
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

        var predicate = filters.Any() ? PredicateBuilder.False<Country>() : PredicateBuilder.True<Country>();

        foreach (var filter in filters)
        {
            var subPredicate = PredicateBuilder.True<Country>();
            if (!string.IsNullOrEmpty(filter.Region))
            {
                subPredicate = subPredicate.And(c => c.Region.Equals(filter.Region, StringComparison.Ordinal));
            }

            if (!string.IsNullOrEmpty(filter.SubRegion))
            {
                subPredicate = subPredicate.And(c => c.SubRegion.Equals(filter.SubRegion, StringComparison.Ordinal));
            }

            predicate = predicate.Or(subPredicate);
        }

        return query.Where(predicate);
    }
}
