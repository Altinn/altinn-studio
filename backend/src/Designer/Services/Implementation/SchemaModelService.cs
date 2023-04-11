using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml.Schema;

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the <see cref="ISchemaModelService"/> providing methods
    /// to work on the schema models (JSON Schema, XSD and generated C# classes)
    /// within a repository. A repository can be either of app or data models type in which
    /// the schema files will be found in different locations.
    /// </summary>
    public class SchemaModelService : ISchemaModelService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly ILoggerFactory _loggerFactory;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;
        private readonly IXmlSchemaToJsonSchemaConverter _xmlSchemaToJsonSchemaConverter;
        private readonly IJsonSchemaToXmlSchemaConverter _jsonSchemaToXmlSchemaConverter;
        private readonly IModelMetadataToCsharpConverter _modelMetadataToCsharpConverter;

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
        /// a lot, only use the parts related to SchemaModels to make it easier to separate out later.
        /// </param>
        /// <param name="xmlSchemaToJsonSchemaConverter">
        /// Class for converting Xml schemas to Json schemas.</param>
        /// <param name="jsonSchemaToXmlSchemaConverter">
        /// Class for converting Json schemas to Xml schemas.</param>
        /// <param name="modelMetadataToCsharpConverter">C# model generator</param>
        public SchemaModelService(
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            ILoggerFactory loggerFactory,
            ServiceRepositorySettings serviceRepositorySettings,
            IXmlSchemaToJsonSchemaConverter xmlSchemaToJsonSchemaConverter,
            IJsonSchemaToXmlSchemaConverter jsonSchemaToXmlSchemaConverter,
            IModelMetadataToCsharpConverter modelMetadataToCsharpConverter)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _loggerFactory = loggerFactory;
            _serviceRepositorySettings = serviceRepositorySettings;
            _xmlSchemaToJsonSchemaConverter = xmlSchemaToJsonSchemaConverter;
            _jsonSchemaToXmlSchemaConverter = jsonSchemaToXmlSchemaConverter;
            _modelMetadataToCsharpConverter = modelMetadataToCsharpConverter;
        }

        /// <inheritdoc/>
        public IList<AltinnCoreFile> GetSchemaFiles(string org, string repository, string developer, bool xsd = false)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);

            return altinnGitRepository.GetSchemaFiles(xsd);
        }

        /// <inheritdoc/>
        public async Task<string> GetSchema(string org, string repository, string developer, string relativeFilePath)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);

            return await altinnAppGitRepository.ReadTextByRelativePathAsync(relativeFilePath);
        }

        /// <inheritdoc/>
        public async Task UpdateSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent, bool saveOnly = false)
        {
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
            var jsonSchema = Json.Schema.JsonSchema.FromText(jsonContent);
            var serializedJsonContent = SerializeJson(jsonSchema);
            if (saveOnly)
            {
                // Only save updated JSON schema - no model file generation
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, serializedJsonContent, true);
                return;
            }

            var repositoryType = await altinnGitRepository.GetRepositoryType();

            if (repositoryType == AltinnRepositoryType.Datamodels)
            {
                // Datamodels repository - save JSON and update XSD
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, serializedJsonContent, true);
                XmlSchema xsd = _jsonSchemaToXmlSchemaConverter.Convert(jsonSchema);
                await altinnGitRepository.SaveXsd(xsd, relativeFilePath.Replace(".schema.json", ".xsd"));
                return;
            }

            await UpdateModelFilesFromJsonSchema(org, repository, developer, relativeFilePath, serializedJsonContent);
        }

        /// <inheritdoc/>
        public async Task<string> UpdateModelFilesFromJsonSchema(string org, string repository, string developer, string relativeFilePath, string jsonContent)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repository, developer);
            var schemaName = altinnAppGitRepository.GetSchemaName(relativeFilePath);

            var jsonSchema = Json.Schema.JsonSchema.FromText(jsonContent);
            var serializedJsonContent = SerializeJson(jsonSchema);
            await altinnAppGitRepository.SaveJsonSchema(serializedJsonContent, schemaName);
            var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(jsonSchema);

            XmlSchema xsd = _jsonSchemaToXmlSchemaConverter.Convert(jsonSchema);

            await altinnAppGitRepository.SaveXsd(xsd, Path.ChangeExtension(schemaName, "xsd"));

            var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
            ModelMetadata modelMetadata = metamodelConverter.Convert(jsonContent);
            string serializedModelMetadata = SerializeModelMetadata(modelMetadata);
            await altinnAppGitRepository.SaveModelMetadata(serializedModelMetadata, schemaName);

            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaName);

            await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName);

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
                var altinnCoreFile = altinnGitRepository.GetAltinnCoreFileByRelativePath(relativeFilePath);
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
        /// <param name="schemaName">The logical name of the schema ie. filename without extension.</param>
        /// <param name="relativePath">The relative path (from repository root) to where the schema should be stored.</param>
        /// <returns>Returns a resolvable uri to the location of the schema.</returns>
        public Uri GetSchemaUri(string org, string repository, string schemaName, string relativePath = "")
        {
            var baseUrl = _serviceRepositorySettings.RepositoryBaseURL;
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

        private Json.Schema.JsonSchema GenerateJsonSchemaFromXsd(Stream xsdStream)
        {
            XmlSchema originalXsd = XmlSchema.Read(xsdStream, (_, _) => { });

            Json.Schema.JsonSchema convertedJsonSchema = _xmlSchemaToJsonSchemaConverter.Convert(originalXsd);

            return convertedJsonSchema;
        }

        private async Task UpdateCSharpClasses(AltinnAppGitRepository altinnAppGitRepository, ModelMetadata modelMetadata, string schemaName)
        {
            string classes = _modelMetadataToCsharpConverter.CreateModelFromMetadata(modelMetadata);
            await altinnAppGitRepository.SaveCSharpClasses(classes, schemaName);
        }

        private static async Task UpdateApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string schemaName, string typeName)
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

            DataType existingLogicElement = application.DataTypes.FirstOrDefault(d => d.AppLogic?.ClassRef != null);
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

        private static string SerializeModelMetadata(ModelMetadata modelMetadata)
        {
            return JsonSerializer.Serialize(
                modelMetadata,
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
            var jsonMetadataFile = Path.Combine(directory, $"{schemaName}.metadata.json");
            var csharpModelFile = Path.Combine(directory, $"{schemaName}.cs");

            return new List<string>() { jsonSchemaFile, xsdFile, jsonMetadataFile, csharpModelFile };
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
            var modelMetadata = metamodelConverter.Convert(jsonContent);
            var serializedModelMetadata = SerializeModelMetadata(modelMetadata);

            await altinnAppGitRepository.SaveModelMetadata(serializedModelMetadata, schemaName);

            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaName);

            await UpdateApplicationMetadata(altinnAppGitRepository, schemaName, modelMetadata.Elements.Values.First(e => e.ParentElement == null).TypeName);

            return jsonContent;
        }
    }
}
