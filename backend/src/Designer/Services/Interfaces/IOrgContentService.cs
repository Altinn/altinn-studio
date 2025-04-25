using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Service for handling general organisation content library operations.
/// </summary>
public interface IOrgContentService
{
    /// <summary>
    /// Retrieves a list of content resources based on the specified type and organisation context.
    /// </summary>
    /// <param name="contentType">The type of content to retrieve.</param>
    /// <param name="context">The organisation context.</param>
    /// <param name="cancellationToken">A token to observe cancellation requests.</param>
    /// <returns>A list of external content library resources.</returns>
    public Task<List<LibraryContentReference>> GetContentList(LibraryContentType contentType, AltinnOrgContext context, CancellationToken cancellationToken = default);
}
