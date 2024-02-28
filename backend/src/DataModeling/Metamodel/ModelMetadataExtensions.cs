using System.Linq;

namespace Altinn.Studio.DataModeling.Metamodel;

public static class ModelMetadataExtensions
{
    public static ElementMetadata GetRootElement(this ModelMetadata modelMetadata) => modelMetadata.Elements.Values.First(e => e.ParentElement == null);
}
