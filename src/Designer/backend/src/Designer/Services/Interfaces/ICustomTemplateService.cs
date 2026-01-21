using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface ICustomTemplateService
{
    public Task<List<CustomTemplate>> GetCustomTemplateList(string developer, CancellationToken cancellationToken);

    public Task ApplyTemplateToRepository(string templateOwner, string templateId, string org, string repository, string developer, CancellationToken cancellationToken = default);
}
