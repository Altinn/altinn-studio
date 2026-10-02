using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.ProcessEditing;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Reads and saves v9 process edits with their dependent file changes, checked against the loaded version.
/// </summary>
public interface IProcessEditingService
{
    /// <summary>
    /// Gets the saved process definition and its version.
    /// </summary>
    ProcessState GetState(AltinnRepoEditingContext editingContext);

    /// <summary>
    /// Checks the request, version and known prerequisites, then saves the edit and returns the saved state.
    /// </summary>
    /// <remarks>
    /// Writes ignore cancellation once they begin. Other failures may leave partial changes; clients must reload
    /// before completing the edit. Folder rename compensation does not undo ancillary file changes.
    /// </remarks>
    /// <exception cref="ProcessEditConflictException">The expected version is stale.</exception>
    /// <exception cref="ProcessEditValidationException">The edit is rejected before writing.</exception>
    Task<ProcessState> Save(
        AltinnRepoEditingContext editingContext,
        ProcessEditRequest request,
        CancellationToken cancellationToken
    );
}
