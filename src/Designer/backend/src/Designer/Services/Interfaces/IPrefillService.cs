#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Interface for reading and writing the prefill configuration file (&lt;model&gt;.prefill.json)
/// belonging to a data model within an app repository.
/// </summary>
public interface IPrefillService
{
    /// <summary>
    /// Gets the JSON content of the prefill configuration file belonging to the specified data model.
    /// </summary>
    /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="modelPath">Relative path to the data model schema file the prefill configuration belongs to.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>JSON content of the prefill configuration file, or null if no such file exists.</returns>
    Task<string> GetPrefill(
        AltinnRepoEditingContext altinnRepoEditingContext,
        string modelPath,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates or updates the prefill configuration file belonging to the specified data model.
    /// </summary>
    /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="modelPath">Relative path to the data model schema file the prefill configuration belongs to.</param>
    /// <param name="jsonContent">The prefill configuration content to persist.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    Task SavePrefill(
        AltinnRepoEditingContext altinnRepoEditingContext,
        string modelPath,
        string jsonContent,
        CancellationToken cancellationToken = default
    );
}
