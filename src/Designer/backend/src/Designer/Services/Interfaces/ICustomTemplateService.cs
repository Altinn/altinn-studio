using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface ICustomTemplateService
{
    /// <summary>
    /// Retrieves a list containing metadata for all available custom templates.
    /// </summary>
    /// <remarks>Lenient deserialization accepting invalid elements in the list and filtering them out before completing the full list</remarks>
    public Task<List<CustomTemplateListObject>> GetCustomTemplateList();

    /// <summary>
    /// Retrieves a single custom template by owner and id.
    /// </summary>
    /// <param name="owner">The short name for the template owner</param>
    /// <param name="id">The ID of the template to retrieve</param>
    /// <returns>The custom template</returns>
    public Task<CustomTemplate> GetCustomTemplateById(string owner, string id);

    /// <summary>
    /// Applies a custom template to a target repository.
    /// </summary>
    /// <param name="templateOwner">The short name for the template owner</param>
    /// <param name="templateId">The ID of the template to apply</param>
    /// <param name="org">The organization to apply the template to</param>
    /// <param name="repo">The repository to apply the template to</param>
    /// <param name="developer">The developer applying the template</param>
    public Task ApplyTemplateToRepository(string templateOwner, string templateId, string org, string repo, string developer);
}
