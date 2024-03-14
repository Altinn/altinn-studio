using System.IO;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IModelNameValidator
{
    Task ValidateModelNameForNewXsdSchema(Stream xsdSchema, string fileName, AltinnRepoEditingContext altinnRepoEditingContext);

    Task ValidateModelNameForNewJsonSchema(JsonNode jsonSchema, string fileName,
        AltinnRepoEditingContext altinnRepoEditingContext);
}
