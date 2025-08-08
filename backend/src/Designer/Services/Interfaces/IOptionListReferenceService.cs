using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Service for handling option list references within layouts.
/// </summary>
public interface IOptionListReferenceService
{
    /// <summary>
    /// Gets all option list references with task data included.
    /// </summary>
    /// <param name="editingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>A list of <see cref="OptionListReference"/> with task data.</returns>
    Task<List<OptionListReference>> GetAllOptionListReferences(AltinnRepoEditingContext editingContext, CancellationToken cancellationToken = default);
}
