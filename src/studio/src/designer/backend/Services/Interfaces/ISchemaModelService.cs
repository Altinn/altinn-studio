using System.Collections.Generic;
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
        /// <returns></returns>
        IList<AltinnCoreFile> GetSchemaFiles(string org, string repository, string developer);
    }
}
