#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Service for handling general organization content library operations.
/// </summary>
public interface IOrgContentService
{
    /// <summary>
    /// Retrieves a list of available library content based on the specified type.
    /// </summary>
    /// <param name="contentType">The type of content to retrieve.</param>
    /// <param name="orgName">The name of the organization.</param>
    /// <returns>A list of external content library resources.</returns>
    public Task<List<LibraryContentReference>> GetOrgContentReferences(LibraryContentType? contentType, string orgName);

    /// <summary>
    /// Checks if the organization's content repository exists in the specified context.
    /// </summary>
    /// <param name="editingContext">The organization context containing organization and developer information.</param>
    /// <returns>True if the content repository exists; otherwise, false.</returns>
    public Task<bool> OrgContentRepoExists(AltinnOrgEditingContext editingContext);
}
