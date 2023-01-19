using Altinn.Studio.DataModeling.Metamodel;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    public interface IModelMetadataParser
    {
        /// <summary>
        /// Create Model from ServiceMetadata object
        /// </summary>
        /// <param name="serviceMetadata">ServiceMetadata object</param>
        /// <returns>The model code in C#</returns>
        public string CreateModelFromMetadata(ModelMetadata serviceMetadata);
    }
}
