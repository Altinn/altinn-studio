#nullable disable
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IModelNameValidator
{
    Task ValidateModelNameForNewXsdSchemaAsync(
        Stream xsdSchema,
        string fileName,
        AltinnRepoEditingContext altinnRepoEditingContext
    );

    Task ValidateModelNameForNewJsonSchemaAsync(string modelName, AltinnRepoEditingContext altinnRepoEditingContext);

    /// <summary>
    /// Refuses a new data model whose C# class another data type already has. Both models' C# files would
    /// declare the class, so the app would not build.
    /// </summary>
    /// <param name="applicationMetadata">The app's application metadata, without the new data model's data type.</param>
    /// <param name="typeName">The new data model's root type name, which is also its C# class name.</param>
    void ValidateTypeNameForNewModel(ApplicationMetadata applicationMetadata, string typeName);
}
