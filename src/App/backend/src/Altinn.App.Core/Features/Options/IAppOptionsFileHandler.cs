using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Options;

/// <summary>
/// Interface for handling option files on disk
/// </summary>
[ImplementableByApps]
public interface IAppOptionsFileHandler
{
    /// <summary>
    /// Reads the app options from file
    /// </summary>
    /// <param name="optionId">The option id that should be loaded. Should equal the filename without the .json extension.</param>
    /// <returns>A <see cref="List{AppOption}"/> containing the option from the json file on disk. If no file is found null is returned.</returns>
    Task<List<AppOption>?> ReadOptionsFromFileAsync(string optionId);
}
