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

        /// <summary>
        /// Try to generate csharp class from generated string from metadata
        /// </summary>
        /// <param name="csharpClass">Csharp class as string</param>
        /// <returns>Boolean indicator of successful generation</returns>
        public void TryGenerateCsharpClass(string csharpClass);
    }
}
