using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Schema;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Manatee.Json;
using Manatee.Json.Schema;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the <see cref="ISchemaModelService"/> providing methods
    /// to work on the schema models (JSON Schema, XSD and generated C# classes)
    /// within a repository. A repository can be either of app or datamodels type in which
    /// the schema files will be found in different locations.
    /// </summary>
    public class SchemaModelService : ISchemaModelService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="SchemaModelService"/> class.
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">Factory class that knows how to create types of <see cref="AltinnGitRepository"/></param>
        public SchemaModelService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <inheritdoc/>
        public IList<AltinnCoreFile> GetSchemaFiles(string org, string repository, string developer)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            return altinnGitRepository.GetSchemaFiles();            
        }

        /// <inheritdoc/>
        public async Task<string> GetSchema(string org, string repository, string developer, string relativeFilePath)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

            return await altinnGitRepository.ReadTextByRelativePathAsync(relativeFilePath);
        }

        /// <inheritdoc/>
        public async Task UpdateSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.Datamodels)
            {              
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonContent);
            }
            else if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

                var schemaName = GetSchemaName(relativeFilePath);
                var jsonSchema = await DeserializeJson(jsonContent);
                var rootName = GetRootName(jsonSchema);

                await UpdateJsonSchema(altinnAppGitRepository, relativeFilePath, jsonContent);
                await UpdateXsd(altinnAppGitRepository, jsonSchema, schemaName);
                await UpdateModelMetadata(altinnAppGitRepository, jsonSchema, schemaName);
                await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, rootName);
                await UpdateCSharpClasses(altinnAppGitRepository);
            }
        }

        private string GetRootName(JsonSchema jsonSchema)
        {
            Guard.AssertArgumentNotNull(jsonSchema.Properties(), nameof(jsonSchema));

            return jsonSchema.Properties().FirstOrDefault().Key;
        }

        private async static Task<bool> UpdateCSharpClasses(AltinnAppGitRepository altinnAppGitRepository)
        {
            return true;
        }

        private async static Task UpdateApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string schemaName, string rootName)
        {
            Application application = await altinnAppGitRepository.GetApplicationMetadata();

            UpdateApplicationWithAppLogicModel(application, schemaName, "Altinn.App.Models." + rootName);

            await altinnAppGitRepository.UpdateApplicationMetadata(application);
        }

        /// <summary>
        /// Adds a new <see cref="DataType"/> to the <see cref="Application"/> metadata.
        /// This does not persist the object.
        /// </summary>
        /// <param name="application">The <see cref="Application"/> object to be updated.</param>
        /// <param name="dataTypeId">The id of the datatype to bed added.</param>
        /// <param name="classRef">The C# class reference of the data type.</param>
        private static void UpdateApplicationWithAppLogicModel(Application application, string dataTypeId, string classRef)
        {
            if (application.DataTypes == null)
            {
                application.DataTypes = new List<DataType>();
            }

            DataType existingLogicElement = application.DataTypes.FirstOrDefault((d) => d.AppLogic != null);
            DataType logicElement = application.DataTypes.SingleOrDefault(d => d.Id == dataTypeId);

            if (logicElement == null)
            {
                logicElement = new DataType
                {
                    Id = dataTypeId,
                    TaskId = existingLogicElement == null ? "Task_1" : null,
                    AllowedContentTypes = new List<string>() { "application/xml" },
                    MaxCount = 1,
                    MinCount = 1,
                };
                application.DataTypes.Add(logicElement);
            }

            logicElement.AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = classRef };
        }

        /// <inheritdoc/>
        public async Task DeleteSchema(string org, string repository, string developer, string relativeFilePath)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.Datamodels)
            {
                altinnGitRepository.DeleteFileByRelativePath(relativeFilePath);
            }
            else if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
                var altinnCoreFile = altinnGitRepository.GetAltinnCoreFileByRealtivePath(relativeFilePath);
                var schemaName = GetSchemaName(altinnCoreFile);

                await DeleteDatatypeFromApplicationMetadata(altinnAppGitRepository, schemaName);
                DeleteRelatedSchemaFiles(altinnAppGitRepository, schemaName, altinnCoreFile.Directory);
            }
        }

        private static async Task UpdateJsonSchema(AltinnAppGitRepository altinnAppGitRepository, string relativeFilePath, string jsonContent)
        {
            await altinnAppGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonContent, true);
        }

        private async static Task UpdateXsd(AltinnAppGitRepository altinnAppGitRepository, JsonSchema jsonSchema, string schemaName)
        {
            using Stream xsdMemoryStream = ConvertJsonSchemaToXsd(jsonSchema);
            await altinnAppGitRepository.WriteStreamByRelativePathAsync($"App/models/{schemaName}.xsd", xsdMemoryStream);
        }

        private async static Task UpdateModelMetadata(AltinnAppGitRepository altinnAppGitRepository, JsonSchema jsonSchema, string schemaName)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(altinnAppGitRepository.Org, altinnAppGitRepository.Repository, jsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            await altinnAppGitRepository.UpdateModelMetadata(modelMetadata, schemaName);
        }

        private static Stream ConvertJsonSchemaToXsd(JsonSchema jsonSchema)
        {
            JsonSchemaToXsd jsonSchemaToXsd = new JsonSchemaToXsd();
            XmlSchema xmlschema = jsonSchemaToXsd.CreateXsd(jsonSchema);

            MemoryStream xsdMemoryStream = new MemoryStream();
            XmlTextWriter xmlTextWriter = new XmlTextWriter(xsdMemoryStream, new UpperCaseUtf8Encoding());
            xmlTextWriter.Formatting = Formatting.Indented;
            xmlTextWriter.WriteStartDocument(false);
            xmlschema.Write(xsdMemoryStream);

            xsdMemoryStream.Seek(0, SeekOrigin.Begin);

            return xsdMemoryStream;
        }

        private static async Task<JsonSchema> DeserializeJson(string content)
        {
            TextReader textReader = new StringReader(content);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            JsonSchema jsonSchema = new Manatee.Json.Serialization.JsonSerializer().Deserialize<JsonSchema>(jsonValue);

            return jsonSchema;
        }

        private void DeleteRelatedSchemaFiles(AltinnAppGitRepository altinnAppGitRepository, string schemaName, string directory)
        {
            var files = GetRelatedSchemaFiles(schemaName, directory);
            foreach (var file in files)
            {
                altinnAppGitRepository.DeleteFileByAbsolutePath(file);
            }
        }

        private IEnumerable<string> GetRelatedSchemaFiles(string schemaName, string directory)
        {
            var xsdFile = Path.Combine(directory, $"{schemaName}.xsd");
            var jsonSchemaFile = Path.Combine(directory, $"{schemaName}.schema.json");

            return new List<string>() { jsonSchemaFile, xsdFile };
        }

        private string GetSchemaName(AltinnCoreFile altinnCoreFile)
        {
            if (altinnCoreFile.FileType.ToLower() == ".json" && altinnCoreFile.FileName.ToLower().EndsWith(".schema.json"))
            {
                return altinnCoreFile.FileName.Remove(altinnCoreFile.FileName.ToLower().IndexOf(".schema.json"));
            }
            else if (altinnCoreFile.FileType.ToLower() == ".xsd")
            {
                return altinnCoreFile.FileName;
            }

            return string.Empty;
        }

        private string GetSchemaName(string filePath)
        {
            var fileInfo = new FileInfo(filePath);

            if (fileInfo.Extension.ToLower() == ".json" && fileInfo.Name.EndsWith(".schema.json"))
            {
                return fileInfo.Name.Remove(fileInfo.Name.ToLower().IndexOf(".schema.json"));
            }
            else if (fileInfo.Extension.ToLower() == ".xsd")
            {
                return fileInfo.Name.Remove(fileInfo.Name.ToLower().IndexOf(".xsd"));
            }

            return string.Empty;
        }

        private async Task DeleteDatatypeFromApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string id)
        {
            var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();

            if (applicationMetadata.DataTypes != null)
            {
                DataType removeForm = applicationMetadata.DataTypes.Find(m => m.Id == id);
                applicationMetadata.DataTypes.Remove(removeForm);
            }

            await altinnAppGitRepository.UpdateApplicationMetadata(applicationMetadata);
        }
    }
}
