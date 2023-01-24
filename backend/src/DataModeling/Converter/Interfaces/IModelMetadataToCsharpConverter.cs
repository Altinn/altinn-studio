using Altinn.Studio.DataModeling.Metamodel;

namespace Altinn.Studio.DataModeling.Converter.Interfaces
{
    public interface IModelMetadataToCsharpConverter
    {
        /// <summary>
        /// Create Model from ServiceMetadata object
        /// </summary>
        /// <param name="serviceMetadata">ServiceMetadata object</param>
        /// <returns>The model code in C#</returns>
        public string CreateModelFromMetadata(ModelMetadata serviceMetadata);
    }
}
