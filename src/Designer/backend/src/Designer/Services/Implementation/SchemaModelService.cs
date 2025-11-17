#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading;
using System.Threading.Tasks;
using System.Xml.Schema;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.DataModeling.Converter.Interfaces;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Json.Schema;
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
        private readonly IApplicationMetadataService _applicationMetadataService;

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
        /// <param name="applicationMetadataService"></param>
        public SchemaModelService(
            IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
            ILoggerFactory loggerFactory,
            ServiceRepositorySettings serviceRepositorySettings,
            IXmlSchemaToJsonSchemaConverter xmlSchemaToJsonSchemaConverter,
            IJsonSchemaToXmlSchemaConverter jsonSchemaToXmlSchemaConverter,
            IModelMetadataToCsharpConverter modelMetadataToCsharpConverter,
            IApplicationMetadataService applicationMetadataService)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _loggerFactory = loggerFactory;
            _serviceRepositorySettings = serviceRepositorySettings;
            _xmlSchemaToJsonSchemaConverter = xmlSchemaToJsonSchemaConverter;
            _jsonSchemaToXmlSchemaConverter = jsonSchemaToXmlSchemaConverter;
            _modelMetadataToCsharpConverter = modelMetadataToCsharpConverter;
            _applicationMetadataService = applicationMetadataService;
        }

        /// <inheritdoc/>
        public IList<AltinnCoreFile> GetSchemaFiles(AltinnRepoEditingContext altinnRepoEditingContext, bool xsd = false)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            return altinnAppGitRepository.GetSchemaFiles(xsd);
        }

        /// <inheritdoc/>
        public async Task<string> GetSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            return await altinnAppGitRepository.ReadTextByRelativePathAsync(relativeFilePath, cancellationToken);
        }

        /// <inheritdoc/>
        public async Task UpdateSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, string jsonContent, bool saveOnly = false, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            var schemaFileName = altinnAppGitRepository.GetSchemaName(relativeFilePath);
            var jsonSchema = JsonSchema.FromText(jsonContent);
            var serializedJsonContent = SerializeJson(jsonSchema);

            await altinnAppGitRepository.SaveJsonSchema(serializedJsonContent, schemaFileName);

            altinnAppGitRepository.DeleteModelMetadata(relativeFilePath.Replace(".schema.json", ".metadata.json"));

            if (saveOnly)
            {
                // Only save updated JSON schema - no model file generation
                await altinnAppGitRepository.WriteTextByRelativePathAsync(relativeFilePath, serializedJsonContent, true, cancellationToken);
                return;
            }

            var repositoryType = await altinnAppGitRepository.GetRepositoryType();

            if (repositoryType == AltinnRepositoryType.Datamodels)
            {
                // Data models repository - save JSON and update XSD
                await altinnAppGitRepository.WriteTextByRelativePathAsync(relativeFilePath, serializedJsonContent, true, cancellationToken);
                await UpdateXsdFromJsonSchema(altinnAppGitRepository, jsonSchema, schemaFileName);
                return;
            }

            ModelMetadata modelMetadata = GetModelMetadataForCsharpGeneration(serializedJsonContent, jsonSchema);
            string csharpModelName = modelMetadata.GetRootElement().TypeName;
            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaFileName);
            await UpdateApplicationMetadata(altinnAppGitRepository, schemaFileName, csharpModelName);
            await UpdateXsdFromJsonSchema(altinnAppGitRepository, jsonSchema, schemaFileName);
        }

        private async Task UpdateXsdFromJsonSchema(AltinnAppGitRepository altinnAppGitRepository, JsonSchema jsonSchema, string schemaFileName)
        {
            XmlSchema xsd = _jsonSchemaToXmlSchemaConverter.Convert(jsonSchema);
            await altinnAppGitRepository.SaveXsd(xsd, Path.ChangeExtension(schemaFileName, "xsd"));
        }

        private ModelMetadata GetModelMetadataForCsharpGeneration(string jsonContent, JsonSchema jsonSchema)
        {
            var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(jsonSchema);
            var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
            return metamodelConverter.Convert(jsonContent);
        }

        public async Task<ModelMetadata> GenerateModelMetadataFromJsonSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
            var jsonContent = await altinnAppGitRepository.ReadTextByRelativePathAsync(relativeFilePath, cancellationToken);
            var jsonSchema = JsonSchema.FromText(jsonContent);
            return GetModelMetadataForCsharpGeneration(jsonContent, jsonSchema);
        }

        /// <summary>
        /// Builds a JSON schema based on the uploaded XSD.
        /// </summary>
        /// <remarks>
        /// This operation is using the new data modelling library.
        /// </remarks>
        /// <param name="altinnRepoEditingContext">An <see cref="AltinnRepoEditingContext"/>.</param>
        /// <param name="fileNameWithExtension">The name of the file being uploaded.</param>
        /// <param name="xsdStream">Stream representing the XSD.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public async Task<string> BuildSchemaFromXsd(AltinnRepoEditingContext altinnRepoEditingContext,
            string fileNameWithExtension, Stream xsdStream, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            MemoryStream xsdMemoryStream = GetXsdMemoryStream(xsdStream);
            JsonSchema jsonSchema = GenerateJsonSchemaFromXsd(xsdMemoryStream);
            string serializedJsonContent = SerializeJson(jsonSchema);

            AltinnRepositoryType altinnRepositoryType = await altinnAppGitRepository.GetRepositoryType();
            if (altinnRepositoryType == AltinnRepositoryType.Datamodels)
            {
                await altinnAppGitRepository.WriteTextByRelativePathAsync(Path.ChangeExtension(fileNameWithExtension, "schema.json"), serializedJsonContent, true, cancellationToken);
                return serializedJsonContent;
            }

            /* From here repository is assumed to be for an app. Validate with a Directory.Exist check? */
            var schemaFileName = altinnAppGitRepository.GetSchemaName(fileNameWithExtension);
            await altinnAppGitRepository.SaveXsd(xsdMemoryStream, fileNameWithExtension);
            await altinnAppGitRepository.SaveJsonSchema(serializedJsonContent, schemaFileName);
            ModelMetadata modelMetadata = GetModelMetadataForCsharpGeneration(serializedJsonContent, jsonSchema);
            string csharpModelName = modelMetadata.GetRootElement().TypeName;
            await UpdateCSharpClasses(altinnAppGitRepository, modelMetadata, schemaFileName);
            await UpdateApplicationMetadata(altinnAppGitRepository, schemaFileName, csharpModelName);

            return serializedJsonContent;
        }

        private MemoryStream GetXsdMemoryStream(Stream xsdStream)
        {
            MemoryStream xsdMemoryStream = new MemoryStream();
            xsdStream.CopyTo(xsdMemoryStream);
            xsdMemoryStream.Position = 0;
            return xsdMemoryStream;
        }

        /// <inheritdoc/>
        public async Task<(string RelativePath, string JsonSchema)> CreateSchemaFromTemplate(AltinnRepoEditingContext altinnRepoEditingContext, string schemaAndModelName, string relativeDirectory = "", bool altinn2Compatible = false, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            // In case of null being passed in we default it to an empty string as the default value
            // on the parameter does not apply if null is actually passed in.
            relativeDirectory ??= string.Empty;

            if (await altinnGitRepository.GetRepositoryType() == AltinnRepositoryType.Datamodels)
            {
                var uri = GetSchemaUri(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, schemaAndModelName, relativeDirectory);
                JsonTemplate jsonTemplate = altinn2Compatible ? new SeresJsonTemplate(uri, schemaAndModelName) : new GeneralJsonTemplate(uri, schemaAndModelName);

                var jsonSchema = jsonTemplate.GetJsonString();

                var relativeFilePath = Path.ChangeExtension(Path.Combine(relativeDirectory, schemaAndModelName), ".schema.json");
                await altinnGitRepository.WriteTextByRelativePathAsync(relativeFilePath, jsonSchema, true, cancellationToken);

                return (relativeFilePath, jsonSchema);
            }
            else
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

                var modelFolder = altinnAppGitRepository.GetRelativeModelFolder();
                var uri = GetSchemaUri(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, schemaAndModelName, modelFolder);
                JsonTemplate jsonTemplate = altinn2Compatible ? new SeresJsonTemplate(uri, schemaAndModelName) : new GeneralJsonTemplate(uri, schemaAndModelName);

                var jsonSchema = jsonTemplate.GetJsonString();

                var relativePath = await altinnAppGitRepository.SaveJsonSchema(jsonSchema, schemaAndModelName);

                await UpdateApplicationMetadata(altinnAppGitRepository, schemaAndModelName, schemaAndModelName);

                return (relativePath, jsonSchema);
            }
        }

        /// <inheritdoc/>
        public async Task DeleteSchema(AltinnRepoEditingContext altinnRepoEditingContext, string relativeFilePath, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);

            if (await altinnGitRepository.GetRepositoryType() == AltinnRepositoryType.App)
            {
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
                var altinnCoreFile = altinnAppGitRepository.GetAltinnCoreFileByRelativePath(relativeFilePath);
                var schemaFileName = altinnAppGitRepository.GetSchemaName(relativeFilePath);

                await DeleteDatatypeFromApplicationMetadataAndLayoutSets(altinnAppGitRepository, schemaFileName);
                DeleteRelatedSchemaFiles(altinnAppGitRepository, schemaFileName, altinnCoreFile.Directory);
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
        /// <param name="schemaFileName">The logical name of the schema ie. filename without extension.</param>
        /// <param name="relativePath">The relative path (from repository root) to where the schema should be stored.</param>
        /// <returns>Returns a resolvable uri to the location of the schema.</returns>
        public Uri GetSchemaUri(string org, string repository, string schemaFileName, string relativePath = "")
        {
            var baseUrl = _serviceRepositorySettings.RepositoryBaseURL;
            baseUrl = baseUrl.TrimEnd("/".ToCharArray());

            Uri schemaUri;

            if (string.IsNullOrEmpty(relativePath))
            {
                schemaUri = new Uri($"{baseUrl}/{org}/{repository}/{schemaFileName}.schema.json");
            }
            else
            {
                relativePath = relativePath.TrimEnd('/');
                relativePath = relativePath.TrimStart('/');
                schemaUri = new Uri($"{baseUrl}/{org}/{repository}/{relativePath}/{schemaFileName}.schema.json");
            }

            return schemaUri;
        }

        private JsonSchema GenerateJsonSchemaFromXsd(Stream xsdStream)
        {
            XmlSchema originalXsd;
            try
            {
                originalXsd = XmlSchema.Read(xsdStream, (_, _) => { });

            }
            catch (Exception ex)
            {
                List<string> customErrorMessages = new() { ex.Message };
                throw new InvalidXmlException("Could not read invalid xml", customErrorMessages);
            }
            JsonSchema convertedJsonSchema = _xmlSchemaToJsonSchemaConverter.Convert(originalXsd);

            return convertedJsonSchema;

        }

        private async Task UpdateCSharpClasses(AltinnAppGitRepository altinnAppGitRepository, ModelMetadata modelMetadata, string schemaFileName)
        {
            ApplicationMetadata application = await altinnAppGitRepository.GetApplicationMetadata();
            string csharpModelName = modelMetadata.GetRootElement().TypeName;
            bool separateNamespace = NamespaceNeedsToBeSeparated(application, csharpModelName);
            string csharpClasses = _modelMetadataToCsharpConverter.CreateModelFromMetadata(modelMetadata,
                separateNamespace, useNullableReferenceTypes: false);
            await altinnAppGitRepository.SaveCSharpClasses(csharpClasses, schemaFileName);
        }

        private async Task UpdateApplicationMetadata(AltinnAppGitRepository altinnAppGitRepository, string schemaFileName, string csharpModelName)
        {
            ApplicationMetadata application = await altinnAppGitRepository.GetApplicationMetadata();

            string fullTypeName = GetFullTypeName(application, csharpModelName);
            UpdateApplicationWithAppLogicModel(application, schemaFileName, fullTypeName);

            await altinnAppGitRepository.SaveApplicationMetadata(application);
        }

        /// <summary>
        /// Adds a new <see cref="Altinn.Platform.Storage.Interface.Models.DataType"/> to the <see cref="Application"/> metadata.
        /// This does not persist the object.
        /// </summary>
        /// <param name="application">The <see cref="Application"/> object to be updated.</param>
        /// <param name="dataTypeId">The id of the datatype to bed added.</param>
        /// <param name="classRef">The C# class reference of the data type.</param>
        private static void UpdateApplicationWithAppLogicModel(ApplicationMetadata application, string dataTypeId, string classRef)
        {
            if (application.DataTypes == null)
            {
                application.DataTypes = new List<DataType>();
            }

            DataType logicElement = application.DataTypes.SingleOrDefault(d => d.Id == dataTypeId);

            if (logicElement == null)
            {
                logicElement = new DataType
                {
                    Id = dataTypeId,
                    TaskId = null,
                    AllowedContentTypes = new List<string>() { "application/xml" },
                    MaxCount = 1,
                    MinCount = 1,
                    AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = classRef },
                };
                application.DataTypes.Add(logicElement);
            }

            if (logicElement.AppLogic == null)
            {
                logicElement.AppLogic = new ApplicationLogic { AutoCreate = true, ClassRef = classRef };
            }

            if (logicElement.AppLogic.ClassRef != classRef)
            {
                logicElement.AppLogic.ClassRef = classRef;
            }
        }

        private static string SerializeJson(JsonSchema jsonSchema)
        {
            return JsonSerializer.Serialize(
                jsonSchema,
                new JsonSerializerOptions
                {
                    Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement),
                    WriteIndented = true
                });
        }

        private static void DeleteRelatedSchemaFiles(AltinnAppGitRepository altinnAppGitRepository, string schemaFileName, string directory)
        {
            var files = GetRelatedSchemaFiles(schemaFileName, directory);
            foreach (var file in files)
            {
                altinnAppGitRepository.DeleteFileByAbsolutePath(file);
            }
        }

        private static IEnumerable<string> GetRelatedSchemaFiles(string schemaFileName, string directory)
        {
            var xsdFile = Path.Combine(directory, $"{schemaFileName}.xsd");
            var jsonSchemaFile = Path.Combine(directory, $"{schemaFileName}.schema.json");
            var csharpModelFile = Path.Combine(directory, $"{schemaFileName}.cs");

            return new List<string>() { jsonSchemaFile, xsdFile, csharpModelFile };
        }

        private static async Task DeleteDatatypeFromApplicationMetadataAndLayoutSets(AltinnAppGitRepository altinnAppGitRepository, string id)
        {
            var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();

            if (applicationMetadata.DataTypes != null)
            {
                DataType dataTypeToDelete = applicationMetadata.DataTypes.Find(m => m.Id == id);
                if (altinnAppGitRepository.AppUsesLayoutSets())
                {
                    var layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
                    List<LayoutSetConfig> layoutSetsWithDataTypeToDelete = layoutSets.Sets.FindAll(set => set.DataType == id);
                    foreach (LayoutSetConfig layoutSet in layoutSetsWithDataTypeToDelete)
                    {
                        layoutSet.DataType = null;
                    }
                    await altinnAppGitRepository.SaveLayoutSets(layoutSets);
                }
                applicationMetadata.DataTypes.Remove(dataTypeToDelete);
                await altinnAppGitRepository.SaveApplicationMetadata(applicationMetadata);
            }
        }

        private string GetFullTypeName(ApplicationMetadata application,
            string csharpModelName)
        {
            bool separateNamespace = NamespaceNeedsToBeSeparated(application, csharpModelName);
            return separateNamespace ? $"Altinn.App.Models.{csharpModelName}.{csharpModelName}" : $"Altinn.App.Models.{csharpModelName}";
        }

        private bool NamespaceNeedsToBeSeparated(ApplicationMetadata application,
            string csharpModelName)
        {
            return application.DataTypes.All(d => d.AppLogic?.ClassRef != $"Altinn.App.Models.{csharpModelName}");
        }

        public async Task<DataType> GetModelDataType(string org, string app, string modelId)
        {
            ApplicationMetadata applicationMetadata = await _applicationMetadataService.GetApplicationMetadataFromRepository(org, app);
            DataType dataType = applicationMetadata.DataTypes.Find((dataType) => dataType.Id == modelId);
            return dataType;
        }

        public async Task SetModelDataType(string org, string app, string modelId, DataType dataType)
        {
            if (dataType.Id != modelId)
            {
                throw new ArgumentException("Provided modelId does not match the DataType's Id");
            }
            ApplicationMetadata applicationMetadata = await _applicationMetadataService.GetApplicationMetadataFromRepository(org, app);
            applicationMetadata.DataTypes.RemoveAll((dt) => dt.Id == dataType.Id);
            applicationMetadata.DataTypes.Add(dataType);
            await _applicationMetadataService.UpdateApplicationMetaDataLocally(org, app, applicationMetadata);
        }
    }
}
