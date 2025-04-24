using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Service for handling general organisation content library operations.
/// </summary>
public interface IOrgContentService
{
    /// <summary>
    /// Retrieves a list of content resources based on the specified type and organisation context.
    /// </summary>
    /// <param name="type">The type of content to retrieve. If null, all types are retrieved.</param>
    /// <param name="context">The organisation context.</param>
    /// <param name="cancellationToken">A token to observe cancellation requests.</param>
    /// <returns>A list of external content library resources.</returns>
    public Task<List<ExternalContentLibraryResource>> GetResourceList(LibraryContentType? type, AltinnOrgContext context, CancellationToken cancellationToken = default);
}
