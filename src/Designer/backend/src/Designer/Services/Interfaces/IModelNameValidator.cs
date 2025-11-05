#nullable disable
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IModelNameValidator
{
    Task ValidateModelNameForNewXsdSchemaAsync(Stream xsdSchema, string fileName, AltinnRepoEditingContext altinnRepoEditingContext);

    Task ValidateModelNameForNewJsonSchemaAsync(string modelName, AltinnRepoEditingContext altinnRepoEditingContext);
}
