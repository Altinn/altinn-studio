using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for handling options lists.
/// </summary>
public interface IOptionsService
{
    /// <summary>
    /// Gets options file in app repository according to specified optionsListId.
    /// </summary>
    /// <param name="org">Organisation</param>
    /// <param name="repo">Repository</param>
    /// <param name="developer">Username of developer</param>
    /// <param name="optionsListId">Options list to fetch</param>
    /// <returns>The options list as a dictionary</returns>
    public Task<List<Dictionary<string, string>>> GetOptions(string org, string repo, string developer, string optionsListId);
}
