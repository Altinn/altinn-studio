using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Factories.ModelFactory;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using Json.Schema;

using Manatee.Json;
using Manatee.Json.Schema;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
        private readonly IOptions<ServiceRepositorySettings> _serviceRepositorySettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="SchemaModelService"/> class.
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">
        /// Factory class that knows how to create types of <see cref="AltinnGitRepository"/>
        /// </param>
        /// <param name="loggerFactory">
        /// Factory class that knows how to create an instance of <see cref="ILogger"/>.
        /// </param>
        /// <param name="serviceRepositorySettings">
        /// Settings for the ServiceRepository. Service is the old name on Apps. This settings class contains
        /// alot, only use the parts related to SchemaModels to make it easier to separate out later.
        /// </param>
        public SchemaModelService(
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            ILoggerFactory loggerFactory,
            IOptions<ServiceRepositorySettings> serviceRepositorySettings)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _loggerFactory = loggerFactory;
            _serviceRepositorySettings = serviceRepositorySettings;
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
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

            return await altinnAppGitRepository.ReadTextByRelativePathAsync(relativeFilePath);
        }

        /// <inheritdoc/>
        public async Task UpdateSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent, bool saveOnly=false)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (await altinnGitRepository.GetRepositoryType() == AltinnRepositoryType.App && !saveOnly)
            {
                await UpdateAllAppModelFiles(org, repository, developer, relativeFilePath, jsonContent);
            }
            else
            {
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonContent, true);
            }
        }

        /// <inheritdoc/>
        public async Task<string> UpdateModelFilesFromJsonSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
            var schemaName = altinnAppGitRepository.GetSchemaName(relativeFilePath);

            await altinnAppGitRepository.SaveJsonSchema(jsonContent, schemaName);
            var jsonSchema = Json.Schema.JsonSchema.FromText(jsonContent);
            var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(jsonSchema);

            var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
            XmlSchema xsd = converter.Convert(jsonSchema);

            await altinnAppGitRepository.SaveXsd(xsd,  Path.ChangeExtension(schemaName, "xsd"));

            var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
            ModelMetadata modelMetadata = metamodelConverter.Convert(schemaName, jsonContent);
            await altinnAppGitRepository.SaveModelMetadata(modelMetadata, schemaName);

            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaName);

            await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, schemaName);

            return jsonContent;
        }

        /// <summary>
        /// Builds a JSON schema based on the uploaded XSD.
        /// </summary>
        /// <remarks>
        /// This operation is using the new data modelling library.
        /// </remarks>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="developer">Developers short name</param>
        /// <param name="fileName">The name of the file being uploaded.</param>
        /// <param name="xsdStream">Stream representing the XSD.</param>
        public async Task<string> BuildSchemaFromXsd(
            string org, string repository, string developer, string fileName, Stream xsdStream)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org, repository, developer);

            MemoryStream xsdMemoryStream = new MemoryStream();
            xsdStream.CopyTo(xsdMemoryStream);
            string jsonContent;
            AltinnRepositoryType altinnRepositoryType = await altinnAppGitRepository.GetRepositoryType();

            if (altinnRepositoryType == AltinnRepositoryType.Datamodels)
            {
                xsdMemoryStream.Position = 0;
                Json.Schema.JsonSchema jsonSchema = GenerateJsonSchemaFromXsd(xsdMemoryStream);
                jsonContent = SerializeJson(jsonSchema);

                await altinnAppGitRepository.WriteTextByRelativePathAsync(
                    Path.ChangeExtension(fileName, "schema.json"), jsonContent, true);

                return jsonContent;
            }

            /* From here repository is assumed to be for an app. Validate with a Directory.Exist check? */
            await altinnAppGitRepository.SaveXsd(xsdMemoryStream, fileName);

            jsonContent = await ProcessNewXsd(altinnAppGitRepository, xsdMemoryStream, fileName);

            return jsonContent;
        }

        /// <inheritdoc/>
        public async Task<string> CreateSchemaFromXsd(string org, string repository, string developer, string relativeFilePath, Stream xsdStream)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (await altinnGitRepository.GetRepositoryType() == AltinnRepositoryType.App)
            {
                await SaveOriginalXsd(org, repository, developer, relativeFilePath, xsdStream);

                Manatee.Json.Schema.JsonSchema jsonSchema = GenerateJsonSchema(xsdStream);

                var jsonContent = SerializeJson(jsonSchema);
                await UpdateAllAppModelFiles(org, repository, developer, Path.ChangeExtension(relativeFilePath, "schema.json"), jsonContent);

                await UpdateAppTexts(org, repository, developer, jsonSchema);

                return jsonContent;
            }
            else
            {
                await SaveOriginalXsd(org, repository, developer, relativeFilePath, xsdStream);

                Manatee.Json.Schema.JsonSchema jsonSchema = GenerateJsonSchema(xsdStream);

                var jsonContent = SerializeJson(jsonSchema);
                await altinnGitRepository.WriteTextByRelativePathAsync(Path.ChangeExtension(relativeFilePath, "schema.json"), jsonContent, true);

                return jsonContent;
            }
        }

        /// <inheritdoc/>
        public async Task<(string RelativePath, string JsonSchema)> CreateSchemaFromTemplate(string org, string repository, string developer, string schemaName, string relativeDirectory = "", bool altinn2Compatible = false)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            // In case of null being passed in we default it to an empty string as the default value
            // on the parameter does not apply if null is actually passed in.
            relativeDirectory ??= string.Empty;

            if (await altinnGitRepository.GetRepositoryType() == AltinnRepositoryType.Datamodels)
            {
                var uri = GetSchemaUri(org, repository, schemaName, relativeDirectory);
                JsonTemplate jsonTemplate = altinn2Compatible ? new SeresJsonTemplate(uri, schemaName) : new GeneralJsonTemplate(uri, schemaName);

                var jsonSchema = jsonTemplate.GetJsonString();

                var relativeFilePath = Path.ChangeExtension(Path.Combine(relativeDirectory, schemaName), ".schema.json");
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonSchema, true);

                return (relativeFilePath, jsonSchema);
            }
            else
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

                var modelFolder = altinnAppGitRepository.GetRelativeModelFolder();
                var uri = GetSchemaUri(org, repository, schemaName, modelFolder);
                JsonTemplate jsonTemplate = altinn2Compatible ? new SeresJsonTemplate(uri, schemaName) : new GeneralJsonTemplate(uri, schemaName);

                var jsonSchema = jsonTemplate.GetJsonString();

                var relativePath = await altinnAppGitRepository.SaveJsonSchema(jsonSchema, schemaName);

                return (relativePath, jsonSchema);
            }
        }

        /// <inheritdoc/>
        public async Task DeleteSchema(string org, string repository, string developer, string relativeFilePath)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            if (await altinnGitRepository.GetRepositoryType() == AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
                var altinnCoreFile = altinnGitRepository.GetAltinnCoreFileByRealtivePath(relativeFilePath);
                var schemaName = altinnGitRepository.GetSchemaName(relativeFilePath);

                await DeleteDatatypeFromApplicationMetadata(altinnAppGitRepository, schemaName);
                DeleteRelatedSchemaFiles(altinnAppGitRepository, schemaName, altinnCoreFile.Directory);
            }
            else
            {
                altinnGitRepository.DeleteFileByRelativePath(relativeFilePath);
            }
        }

        /// <summary>
        /// Gets the <see cref="Uri"/> to the schema within the repository.
        /// </summary>
        /// <param name="org">Organization owning the repository identified by it's short name.</param>
        /// <param name="repository">Repository name to search for schema files.</param>
        /// <param name="schemaName">The logical name of the schema ie. filename without extention.</param>
        /// <param name="relativePath">The relative path (from repository root) to where the schema should be stored.</param>
        /// <returns>Returns a resolvable uri to the location of the schema.</returns>
        public Uri GetSchemaUri(string org, string repository, string schemaName, string relativePath = "")
        {
            var baseUrl = _serviceRepositorySettings.Value.RepositoryBaseURL;
            baseUrl = baseUrl.TrimEnd("/".ToCharArray());

            Uri schemaUri;

            if (string.IsNullOrEmpty(relativePath))
            {
                schemaUri = new Uri($"{baseUrl}/{org}/{repository}/{schemaName}.schema.json");
            }
            else
            {
                relativePath = relativePath.TrimEnd('/');
                relativePath = relativePath.TrimStart('/');
                schemaUri = new Uri($"{baseUrl}/{org}/{repository}/{relativePath}/{schemaName}.schema.json");
            }

            return schemaUri;
        }

        private async Task UpdateAllAppModelFiles(string org, string repository, string developer, string relativeFilePath, string jsonContent)
        {
            if (!relativeFilePath.ToLower().EndsWith(".schema.json"))
            {
                throw new ArgumentException($"This methods expects a model file with extension .schema.json, a file named {relativeFilePath} was provided.");
            }

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

            var schemaName = altinnAppGitRepository.GetSchemaName(relativeFilePath);
            var jsonSchema = await DeserializeJson(jsonContent);
            var rootName = GetRootName(jsonSchema);

            await UpdateJsonSchema(altinnAppGitRepository, relativeFilePath, jsonContent);
            await UpdateXsd(altinnAppGitRepository, jsonSchema, schemaName);
            var modelMetadata = await UpdateModelMetadata(altinnAppGitRepository, jsonSchema, schemaName);
            await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, schemaName);
            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaName);
        }

        private async Task UpdateAppTexts(
            string org, string repository, string developer, Manatee.Json.Schema.JsonSchema jsonSchema)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(org, repository, jsonSchema);
            var newTexts = converter.GetTexts();

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
            var existingTexts = await altinnAppGitRepository.GetTextResourcesForAllLanguages();

            MergeTexts(newTexts, existingTexts);

            await altinnAppGitRepository.SaveServiceTexts(existingTexts);
        }

        private Manatee.Json.Schema.JsonSchema GenerateJsonSchema(Stream xsdStream)
        {
            var xmlReader = XmlReader.Create(xsdStream, new XmlReaderSettings { IgnoreWhitespace = true });
            var xsdToJsonSchemaConverter = new XsdToJsonSchema(xmlReader, _loggerFactory.CreateLogger<XsdToJsonSchema>());
            var jsonSchema = xsdToJsonSchemaConverter.AsJsonSchema();

            return jsonSchema;
        }

        private Json.Schema.JsonSchema GenerateJsonSchemaFromXsd(Stream xsdStream)
        {
            XmlSchema originalXsd = XmlSchema.Read(xsdStream, (_, _) => { });

            var xsdToJsonConverter = new XmlSchemaToJsonSchemaConverter();
            Json.Schema.JsonSchema convertedJsonSchema = xsdToJsonConverter.Convert(originalXsd);

            return convertedJsonSchema;
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

        private static string GetRootName(Manatee.Json.Schema.JsonSchema jsonSchema)
        {
            Guard.AssertArgumentNotNull(jsonSchema.Properties(), nameof(jsonSchema));

            return jsonSchema.Properties().FirstOrDefault().Key;
        }

        private async static Task UpdateCSharpClasses(AltinnAppGitRepository altinnAppGitRepository, ModelMetadata modelMetadata, string schemaName)
        {
            JsonMetadataParser modelGenerator = new JsonMetadataParser();
            string classes = modelGenerator.CreateModelFromMetadata(modelMetadata);
            await altinnAppGitRepository.SaveCSharpClasses(classes, schemaName);
        }

        private async static Task UpdateApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string schemaName, string typeName)
        {
            Application application = await altinnAppGitRepository.GetApplicationMetadata();

            UpdateApplicationWithAppLogicModel(application, schemaName, "Altinn.App.Models." + typeName);

            await altinnAppGitRepository.SaveApplicationMetadata(application);
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

        private async static Task UpdateXsd(
            AltinnAppGitRepository altinnAppGitRepository,
            Manatee.Json.Schema.JsonSchema jsonSchema,
            string schemaName)
        {
            using Stream xsdMemoryStream = ConvertJsonSchemaToXsd(jsonSchema);
            await altinnAppGitRepository.WriteStreamByRelativePathAsync($"App/models/{schemaName}.xsd", xsdMemoryStream, true);
        }

        private async static Task<ModelMetadata> UpdateModelMetadata(
            AltinnAppGitRepository altinnAppGitRepository,
            Manatee.Json.Schema.JsonSchema jsonSchema,
            string schemaName)
        {
            JsonSchemaToInstanceModelGenerator converter = new JsonSchemaToInstanceModelGenerator(altinnAppGitRepository.Org, altinnAppGitRepository.Repository, jsonSchema);
            ModelMetadata modelMetadata = converter.GetModelMetadata();

            await altinnAppGitRepository.SaveModelMetadata(modelMetadata, schemaName);

            return modelMetadata;
        }

        private static Stream ConvertJsonSchemaToXsd(Manatee.Json.Schema.JsonSchema jsonSchema)
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

        private static async Task<Manatee.Json.Schema.JsonSchema> DeserializeJson(string content)
        {
            TextReader textReader = new StringReader(content);
            JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
            Manatee.Json.Schema.JsonSchema jsonSchema =
                new Manatee.Json.Serialization.JsonSerializer().Deserialize<Manatee.Json.Schema.JsonSchema>(jsonValue);

            return jsonSchema;
        }

        private static string SerializeJson(Manatee.Json.Schema.JsonSchema jsonSchema)
        {
            return new Manatee.Json.Serialization.JsonSerializer().Serialize(jsonSchema).GetIndentedString(0);
        }

        private static string SerializeJson(Json.Schema.JsonSchema jsonSchema)
        {
            return JsonSerializer.Serialize(
                jsonSchema,
                new JsonSerializerOptions
                {
                    Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
                    WriteIndented = true
                });
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

        private static async Task DeleteDatatypeFromApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string id)
        {
            var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();

            if (applicationMetadata.DataTypes != null)
            {
                DataType removeForm = applicationMetadata.DataTypes.Find(m => m.Id == id);
                applicationMetadata.DataTypes.Remove(removeForm);
            }

            await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
        }

        private async Task<string> ProcessNewXsd(AltinnAppGitRepository altinnAppGitRepository, MemoryStream xsdMemoryStream, string filePath)
        {
            var schemaName = altinnAppGitRepository.GetSchemaName(filePath);

            Json.Schema.JsonSchema jsonSchema = GenerateJsonSchemaFromXsd(xsdMemoryStream);
            var jsonContent = SerializeJson(jsonSchema);
            await altinnAppGitRepository.SaveJsonSchema(jsonContent, schemaName);

            var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(jsonSchema);
            var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
            var modelMetadata = metamodelConverter.Convert(schemaName, jsonContent);
            await altinnAppGitRepository.SaveModelMetadata(modelMetadata, schemaName);

            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaName);

            await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, schemaName);

            return jsonContent;
        }
    }
}
