using Altinn.Studio.DataModeling.Metamodel;

namespace Altinn.Studio.DataModeling.Converter.Interfaces
{
    public interface IModelMetadataToCsharpConverter
    {
        /// <summary>
        /// Create Model from ServiceMetadata object
        /// </summary>
        /// <param name="serviceMetadata">ServiceMetadata object</param>
        /// <param name="separateNamespaces">Indicates if models should be stored in the separate namespace.</param>
        /// <returns>The model code in C#</returns>
        public string CreateModelFromMetadata(ModelMetadata serviceMetadata, bool separateNamespaces = false);
    }
}
