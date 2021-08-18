using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
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
using Microsoft.Extensions.Logging;

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
        private readonly ILoggerFactory _loggerFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="SchemaModelService"/> class.
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">Factory class that knows how to create types of <see cref="AltinnGitRepository"/></param>
        /// <param name="loggerFactory">Factory class that knows how to create an instance of <see cref="ILogger"/>.</param>
        public SchemaModelService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, ILoggerFactory loggerFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _loggerFactory = loggerFactory;
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

            return await altinnGitRepository.ReadAllTextByRelativePathAsync(relativeFilePath);
        }

        /// <inheritdoc/>
        public async Task UpdateSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                await UpdateAllAppModelFiles(org, repository, developer, relativeFilePath, jsonContent);
            }
            else 
            {              
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonContent);
            } 
        }

        /// <inheritdoc/>
        public async Task<string> CreateSchemaFromXsd(string org, string repository, string developer, string relativeFilePath, Stream xsdStream)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                await SaveOriginalXsd(org, repository, developer, relativeFilePath, xsdStream);

                JsonSchema jsonSchema = GenerateJsonSchema(xsdStream);

                var jsonContent = SerializeJson(jsonSchema);
                await UpdateAllAppModelFiles(org, repository, developer, Path.ChangeExtension(relativeFilePath, "schema.json"), jsonContent);

                await UpdateAppTexts(org, repository, developer, jsonSchema);

                return jsonContent;
            }
            else
            {
                await SaveOriginalXsd(org, repository, developer, relativeFilePath, xsdStream);

                JsonSchema jsonSchema = GenerateJsonSchema(xsdStream);

                var jsonContent = SerializeJson(jsonSchema);
                await altinnGitRepository.WriteTextByRelativePathAsync(Path.ChangeExtension(relativeFilePath, "schema.json"), jsonContent, true);

                return jsonContent;
            }
        }

        /// <inheritdoc/>
        public async Task DeleteSchema(string org, string repository, string developer, string relativeFilePath)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (altinnGitRepository.RepositoryType == Enums.AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
                var altinnCoreFile = altinnGitRepository.GetAltinnCoreFileByRealtivePath(relativeFilePath);
                var schemaName = GetSchemaName(relativeFilePath);

                await DeleteDatatypeFromApplicationMetadata(altinnAppGitRepository, schemaName);
                DeleteRelatedSchemaFiles(altinnAppGitRepository, schemaName, altinnCoreFile.Directory);
            }
            else
            {
                altinnGitRepository.DeleteFileByRelativePath(relativeFilePath);
            }
        }

        private async Task UpdateAllAppModelFiles(string org, string repository, string developer, string relativeFilePath, string jsonContent)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

            var schemaName = GetSchemaName(relativeFilePath);
            var jsonSchema = await DeserializeJson(jsonContent);
            var rootName = GetRootName(jsonSchema);

            await UpdateJsonSchema(altinnAppGitRepository, relativeFilePath, jsonContent);
            await UpdateXsd(altinnAppGitRepository, jsonSchema, schemaName);
            var modelMetadata = await UpdateModelMetadata(altinnAppGitRepository, jsonSchema, schemaName);
            await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, rootName);
            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaName);
        }

        private async Task UpdateAppTexts(string org, string repository, string developer, JsonSchema jsonSchema)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, repository, jsonSchema);
            var newTexts = converter.GetTexts();

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
            var existingTexts = await altinnAppGitRepository.GetTextResourcesForAllLanguages();

            MergeTexts(newTexts, existingTexts);

            await altinnAppGitRepository.SaveServiceTexts(existingTexts);
        }

        private JsonSchema GenerateJsonSchema(Stream xsdStream)
        {
            var xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });
            var xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader, _loggerFactory.CreateLogger<XsdToJsonSchema>());
            var jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            return jsonSchema;
        }

        private async Task SaveOriginalXsd(string org, string repository, string developer, string relativeFilePath, Stream xsdStream)
        {
            AssertValidXsd(xsdStream);

            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
            var fileNameWithOriginal = GetFileNameWithOrignal(relativeFilePath);
            await altinnGitRepository.WriteStreamByRelativePathAsync(fileNameWithOriginal, xsdStream, true);

            xsdStream.Seek(0, SeekOrigin.Begin);
        }

        private static void AssertValidXsd(Stream xsdStream)
        {
            XmlReader reader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });
            XDocument.Load(reader, LoadOptions.None);
            xsdStream.Seek(0, SeekOrigin.Begin);
        }

        private static string GetFileNameWithOrignal(string relativeFilePath)
        {
            var fileExtension = Path.GetExtension(relativeFilePath);
            var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(relativeFilePath);
            var fileNameWithOriginal = $"{fileNameWithoutExtension}.original{fileExtension}";

            return Path.Combine(Path.GetDirectoryName(relativeFilePath), fileNameWithOriginal);
        }

        private static void MergeTexts(Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>> newTexts, Dictionary<string, Dictionary<string, Designer.Models.TextResourceElement>> existingTexts)
        {
            foreach (KeyValuePair<string, Dictionary<string, Designer.Models.TextResourceElement>> textResourceElementDict in newTexts)
            {
                string textResourceElementId = textResourceElementDict.Key;

                if (!existingTexts.ContainsKey(textResourceElementId))
                {
                    existingTexts.Add(textResourceElementId, new Dictionary<string, Designer.Models.TextResourceElement>());
                }

                foreach (KeyValuePair<string, Designer.Models.TextResourceElement> localizedString in textResourceElementDict.Value)
                {
                    string language = localizedString.Key;
                    Designer.Models.TextResourceElement textResourceElement = localizedString.Value;
                    if (!existingTexts[textResourceElementId].ContainsKey(language))
                    {
                        existingTexts[textResourceElementId].Add(language, textResourceElement);
                    }
                }
            }
        }

        private static string GetRootName(JsonSchema jsonSchema)
        {
            Guard.AssertArgumentNotNull(jsonSchema.Properties(), nameof(jsonSchema));

            return jsonSchema.Properties().FirstOrDefault().Key;
        }

        private async static Task UpdateCSharpClasses(AltinnAppGitRepository altinnAppGitRepository, ModelMetadata modelMetadata, string schemaName)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();
            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            await altinnAppGitRepository.UpdateCSharpClasses(classes, schemaName);
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

        private static async Task UpdateJsonSchema(AltinnAppGitRepository altinnAppGitRepository, string relativeFilePath, string jsonContent)
        {
            await altinnAppGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonContent, true);
        }

        private async static Task UpdateXsd(AltinnAppGitRepository altinnAppGitRepository, JsonSchema jsonSchema, string schemaName)
        {
            using Stream xsdMemoryStream = ConvertJsonSchemaToXsd(jsonSchema);
            await altinnAppGitRepository.WriteStreamByRelativePathAsync($"App/models/{schemaName}.xsd", xsdMemoryStream, true);
        }

        private async static Task<ModelMetadata> UpdateModelMetadata(AltinnAppGitRepository altinnAppGitRepository, JsonSchema jsonSchema, string schemaName)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(altinnAppGitRepository.Org, altinnAppGitRepository.Repository, jsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            await altinnAppGitRepository.UpdateModelMetadata(modelMetadata, schemaName);

            return modelMetadata;
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

        private static string SerializeJson(JsonSchema jsonSchema)
        {
            return new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonSchema).GetIndentedString(0);
        }

        private static void DeleteRelatedSchemaFiles(AltinnAppGitRepository altinnAppGitRepository, string schemaName, string directory)
        {
            var files = GetRelatedSchemaFiles(schemaName, directory);
            foreach (var file in files)
            {
                altinnAppGitRepository.DeleteFileByAbsolutePath(file);
            }
        }

        private static IEnumerable<string> GetRelatedSchemaFiles(string schemaName, string directory)
        {
            var xsdFile = Path.Combine(directory, $"{schemaName}.xsd");
            var jsonSchemaFile = Path.Combine(directory, $"{schemaName}.schema.json");

            return new List<string>() { jsonSchemaFile, xsdFile };
        }

        private static string GetSchemaName(string filePath)
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

        private static async Task DeleteDatatypeFromApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string id)
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
