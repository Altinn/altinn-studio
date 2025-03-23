using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for handling model schemas in a repository.
    /// Schema models are first and foremost JSON Schema files,
    /// but also the generated XSD's and C# files.
    /// </summary>
    public interface ISchemaModelService
    {
        /// <summary>
        /// Gets a list of the schema files within App/models directory.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="xsd">Value to indicate if schema files should be XSDs or not</param>
        /// <returns>A list of schema files within the App/models directory.</returns>
        IList<AltinnCoreFile> GetSchemaFiles(AltinnRepoEditingContext altinnRepoEditingContext, bool xsd = false);

        /// <summary>
        /// Gets the JSON content of the specified schema file.
        /// </summary>
        /// /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>JSON content of the schema file specified.</returns>
        Task<string> GetSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, CancellationToken cancellationToken = default);

        /// <summary>
        /// Updates a schema based on the relative path to the JSON Schema within the repository.
        /// For a datamodels repository this will only update the file itself. For a app
        /// repository this will update the generated files as well e.g. the C# class.
        /// </summary>
        /// /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>
        /// <param name="jsonContent">The JSON contents of the file.</param>
        /// <param name="saveOnly">Optional. If this flag is set to true, only json schema model is saved, no other model files are updated.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task UpdateSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, string jsonContent, bool saveOnly = false, CancellationToken cancellationToken = default);

        /// <summary>
        /// Builds a JSON schema based on the uploaded XSD.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="fileNameWithExtension">The name of the new file.</param>
        /// <param name="xsdStream">Stream representing the XSD.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task<string> BuildSchemaFromXsd(AltinnRepoEditingContext altinnRepoEditingContext, string fileNameWithExtension, Stream xsdStream, CancellationToken cancellationToken = default);

        /// <summary>
        /// Creates a JSON schema based on a template.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="schemaAndModelName">The name of the schema/model (no extension).</param>
        /// <param name="relativeDirectory">The directory where the schema should be created. Applies only for schemas
        /// created in a data models repository. For app repositories the directory is determined by the app and the parameter is ignored.</param>
        /// <param name="altinn2Compatible">True if the schema should be Altinn 2 compatible when generating XSD. False (default) creates a Altinn 3 schema.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Returns a tuple where the first string is the relative path to the file and the second is the Json Schema created.</returns>
        Task<(string RelativePath, string JsonSchema)> CreateSchemaFromTemplate(AltinnRepoEditingContext altinnRepoEditingContext, string schemaAndModelName, string relativeDirectory = "", bool altinn2Compatible = false, CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes a schema based on the relative path to the JSON Schema within the repository.
        /// For a datamodels repository this will only delete the file itself. For a app
        /// repository this will remove the datatype from the <see cref="Application"/> as well
        /// as clean up other generated files.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        Task DeleteSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, CancellationToken cancellationToken = default);

        /// <summary>
        /// Generates a model metadata from a JSON schema.
        /// </summary>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Returns the model metadata</returns>
        Task<ModelMetadata> GenerateModelMetadataFromJsonSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the dataType for a given model.
        /// </summary>
        Task<DataType> GetModelDataType(string org, string app, string modelId);

        /// <summary>
        /// Updates the dataType for a given model.
        /// </summary>
        Task SetModelDataType(string org, string app, string modelId, DataType dataType);
    }
}
