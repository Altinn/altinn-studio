using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Interface for providing <see cref="DataList"/>
/// </summary>
[ImplementableByApps]
public interface IDataListProvider
{
    /// <summary>
    /// The id/name of the options this provider supports ie. land, fylker, kommuner.
    /// You can have as many providers as you like, but you should have only one per id.
    /// </summary>
    string Id { get; }

    /// <summary>
    /// Gets the <see cref="DataList"/> based on the provided options id and key value pairs.
    /// </summary>
    /// <param name="language">Language code</param>
    /// <param name="keyValuePairs">Key/value pairs to control what options to get.
    /// When called from the data lists controller this will be the querystring key/value pairs.</param>
    /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
    Task<DataList> GetDataListAsync(string? language, Dictionary<string, string> keyValuePairs);
}
