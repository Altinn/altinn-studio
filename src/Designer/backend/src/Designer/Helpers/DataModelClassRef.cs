using System.Linq;
using Altinn.App.Core.Models;
using Altinn.Studio.Designer.Exceptions.DataModeling;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// The C# class of an app's data model, as the class reference of its data type in the application metadata
/// names it.
/// </summary>
internal static class DataModelClassRef
{
    /// <summary>
    /// Refuses a new data model whose C# class a data type in the app already has. Both models' C# files would declare
    /// the class, so the app would not build.
    /// </summary>
    /// <param name="applicationMetadata">The app's application metadata.</param>
    /// <param name="typeName">The new data model's root type name, which is also its C# class name.</param>
    /// <exception cref="ModelWithTheSameBaseTypeAlreadyExists">A data type has the class.</exception>
    public static void ThrowIfAnotherDataTypeHasClass(ApplicationMetadata applicationMetadata, string typeName)
    {
        bool anotherDataTypeHasClass = applicationMetadata.DataTypes.Any(dataType =>
            dataType.AppLogic?.ClassRef == $"Altinn.App.Models.{typeName}"
            || dataType.AppLogic?.ClassRef == $"Altinn.App.Models.{typeName}.{typeName}"
        );
        if (anotherDataTypeHasClass)
        {
            throw new ModelWithTheSameBaseTypeAlreadyExists();
        }
    }
}
