using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
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
        /// Gets a list of the schema files within the repository.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developers short name</param>
        /// <returns>A total list of schema files within the repository, regardless of location.</returns>
        IList<AltinnCoreFile> GetSchemaFiles(string org, string repository, string developer);

        /// <summary>
        /// Gets the JSON content of the specified schema file.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name where the schema file recides.</param>
        /// <param name="developer">Developers short name</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>     
        /// <returns>JSON content of the schema file specified.</returns>
        Task<string> GetSchema(string org, string repository, string developer, string relativeFilePath);

        /// <summary>
        /// Updates a schema based on the relative path to the JSON Schema within the repository.
        /// For a datamodels repository this will only update the file itself. For a app
        /// repository this will update the generated files as well e.g. the C# class.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developers short name</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>
        /// <param name="jsonContent">The JSON contents of the file.</param>
        Task UpdateSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent);

        /// <summary>
        /// Creates a JSON schema based on a XSD.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developers short name</param>
        /// <param name="relativeFilePath">Relative path to the file (where in the repository it should be stored).</param>
        /// <param name="xsdStream">Stream representing the XSD.</param>
        Task<string> CreateSchemaFromXsd(string org, string repository, string developer, string relativeFilePath, Stream xsdStream);

        /// <summary>
        /// Creates a JSON schema based on a XSD.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developers short name</param>
        /// <param name="schemaName">The name of the schema/model (no extension).</param>
        /// <param name="altinn2Compatible">True if the schema should be Altinn 2 compatible when generating XSD. False (default) creates a Altinn 3 schema.</param>
        /// <returns>String representation of the created Json Schema.</returns>
        Task<string> CreateSchemaFromTemplate(string org, string repository, string developer, string schemaName, bool altinn2Compatible = false);

        /// <summary>
        /// Deletes a schema based on the relative path to the JSON Schema within the repository.
        /// For a datamodels repository this will only delete the file itself. For a app
        /// repository this will remove the datatype from the <see cref="Application"/> as well
        /// as clean up other generated files.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developers short name</param>
        /// <param name="relativeFilePath">Relative path to the file.</param>        
        Task DeleteSchema(string org, string repository, string developer, string relativeFilePath);
    }
}
