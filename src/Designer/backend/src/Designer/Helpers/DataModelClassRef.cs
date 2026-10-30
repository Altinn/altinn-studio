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
    private const string ModelsNamespace = "Altinn.App.Models";

    /// <summary>
    /// Gets the class reference of a root type in the namespace that the app's data models share.
    /// </summary>
    /// <param name="typeName">The root type name, which is also the C# class name.</param>
    public static string InSharedNamespace(string typeName) => $"{ModelsNamespace}.{typeName}";

    /// <summary>
    /// Gets the class reference of a root type in a namespace of its own.
    /// </summary>
    /// <param name="typeName">The root type name, which is also the C# class name.</param>
    public static string InOwnNamespace(string typeName) => $"{ModelsNamespace}.{typeName}.{typeName}";

    /// <summary>
    /// Refuses a data model whose C# class another data type has. Both models' C# files would declare the class,
    /// so the app would not build.
    /// </summary>
    /// <param name="applicationMetadata">The app's application metadata.</param>
    /// <param name="typeName">The data model's root type name, which is also its C# class name.</param>
    /// <param name="replacedDataTypeId">
    /// The data type that the data model replaces, so that its class does not count, or null when the data model
    /// replaces none.
    /// </param>
    /// <exception cref="ModelWithTheSameBaseTypeAlreadyExists">Another data type has the class.</exception>
    public static void ThrowIfAnotherDataTypeHasClass(
        ApplicationMetadata applicationMetadata,
        string typeName,
        string? replacedDataTypeId
    )
    {
        string inSharedNamespace = InSharedNamespace(typeName);
        string inOwnNamespace = InOwnNamespace(typeName);
        bool anotherDataTypeHasClass = (applicationMetadata.DataTypes ?? []).Any(dataType =>
            dataType.Id != replacedDataTypeId
            && (dataType.AppLogic?.ClassRef == inSharedNamespace || dataType.AppLogic?.ClassRef == inOwnNamespace)
        );
        if (anotherDataTypeHasClass)
        {
            throw new ModelWithTheSameBaseTypeAlreadyExists();
        }
    }
}
