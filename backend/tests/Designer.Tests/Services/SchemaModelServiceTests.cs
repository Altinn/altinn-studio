using System;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services
{
    public class SchemaModelServiceTests
    {
        private readonly Mock<IApplicationMetadataService> _applicationMetadataService;
        private readonly AltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly ISchemaModelService _schemaModelService;

        public SchemaModelServiceTests()
        {
            _applicationMetadataService = new Mock<IApplicationMetadataService>();
            _altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            _schemaModelService = new SchemaModelService(_altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter, _applicationMetadataService.Object);
        }

        [Fact]
        public async Task DeleteSchema_AppRepo_ShouldDelete()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                Assert.Equal(7, schemaFiles.Count);

                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                Assert.Equal(2, applicationMetadata.DataTypes.Count);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await _schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                Assert.Equal(6, schemaFiles.Count);
                applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                Assert.Single(applicationMetadata.DataTypes);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task DeleteSchema_AppRepoWithLayoutSets_ShouldDelete()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "app-with-layoutsets";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                string dataModelName = "datamodel";

                var schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                Assert.Single(schemaFiles);

                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                var applicationMetadataBefore = await altinnAppGitRepository.GetApplicationMetadata();
                var layoutSetsBefore = await altinnAppGitRepository.GetLayoutSetsFile();

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == $"{dataModelName}.schema.json");
                await _schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                Assert.Empty(schemaFiles);
                var applicationMetadataAfter = await altinnAppGitRepository.GetApplicationMetadata();
                Assert.Equal(applicationMetadataBefore.DataTypes.Count - 1, applicationMetadataAfter.DataTypes.Count);
                var layoutSetsAfter = await altinnAppGitRepository.GetLayoutSetsFile();

                Assert.True(layoutSetsBefore.Sets.Exists(set => set.DataType == dataModelName));
                Assert.False(layoutSetsAfter.Sets.Exists(set => set.DataType == dataModelName));
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task DeleteSchema_ModelsRepo_ShouldDelete()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {

                var schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                Assert.Equal(7, schemaFiles.Count);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await _schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                Assert.Equal(6, schemaFiles.Count);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task UpdateSchema_AppRepo_ShouldUpdate()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {

                // Act
                var expectedSchemaUpdates = @"{""properties"":{""rootType1"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";
                await _schemaModelService.UpdateSchema(editingContext, "App/models/HvemErHvem_SERES.schema.json", expectedSchemaUpdates);

                // Assert
                var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);

                var updatedSchema = await altinnGitRepository.ReadTextByRelativePathAsync("App/models/HvemErHvem_SERES.schema.json");
                string serializedExpectedSchemaUpdates = FormatJsonString(updatedSchema);
                Assert.Equal(serializedExpectedSchemaUpdates, updatedSchema);

                var xsd = await altinnGitRepository.ReadTextByRelativePathAsync("App/models/HvemErHvem_SERES.xsd");

                // Generated XSD included for reference
                // <?xml version="1.0"?>
                // <xsd:schema attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
                //   <xsd:element name="root" type="rootType" />
                //   <xsd:complexType name="rootType">
                //     <xsd:sequence>
                //       <xsd:element minOccurs="0" name="keyword" nillable="true" type="xsd:string" />
                //     </xsd:sequence>
                //   </xsd:complexType>
                // </xsd:schema>
                var xsdSchema = XDocument.Parse(xsd);
                Assert.NotNull(xsdSchema.Root);
                Assert.Equal("root", xsdSchema.Root.Elements().First().Attributes().First(a => a.Name.LocalName == "name").Value);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task UpdateSchema_ModelMetadataExistForModelInRepo_ShouldDeleteModelMetadata()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var updatedSchema = @"{""properties"":{""rootType1"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";

                var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);
                Assert.True(altinnGitRepository.FileExistsByRelativePath("App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.metadata.json"));
                await _schemaModelService.UpdateSchema(editingContext, "App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json", updatedSchema);
                Assert.False(altinnGitRepository.FileExistsByRelativePath("App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.metadata.json"));
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task UpdateSchema_NoModelMetadataForModelInRepo_ShouldOnlyUpdate()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var expectedUpdatedSchema = @"{""properties"":{""rootType1"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";
                var altinnGitRepository = _altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);
                Assert.False(altinnGitRepository.FileExistsByRelativePath("App/models/HvemErHvem_SERES.metadata.json"));

                await _schemaModelService.UpdateSchema(editingContext, "App/models/HvemErHvem_SERES.schema.json", expectedUpdatedSchema);
                Assert.False(altinnGitRepository.FileExistsByRelativePath("App/models/HvemErHvem_SERES.metadata.json"));
                var updatedSchema = await altinnGitRepository.ReadTextByRelativePathAsync("App/models/HvemErHvem_SERES.schema.json");
                string serializedExpectedSchemaUpdates = FormatJsonString(updatedSchema);
                Assert.Equal(serializedExpectedSchemaUpdates, updatedSchema);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task UpdateSchema_InvalidJsonSchema_ShouldThrowException()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            var invalidSchema =
                @"{""properties"":{""root"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";

            var exception = await Assert.ThrowsAsync<CsharpCompilationException>(async () =>
            {
                await _schemaModelService.UpdateSchema(editingContext, "App/models/HvemErHvem_SERES.schema.json", invalidSchema);
            });

            Assert.NotNull(exception.CustomErrorMessages);
            Assert.Single(exception.CustomErrorMessages, c => c.Contains("root': member names cannot be the same as their enclosing type"));
        }

        [Fact]
        public async Task UploadSchemaFromXsd_InvalidXsd_ThrowsException()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "empty-app-pref-json";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var xsdStream = SharedResourcesHelper.LoadTestData("Model/XmlSchema/General/SimpleInvalidNonSeresSchema.xsd");
                var schemaName = "SimpleInvalidNonSeresSchema";
                var fileName = $"{schemaName}.xsd";

                Func<Task> action = () => _schemaModelService.BuildSchemaFromXsd(editingContext, fileName, xsdStream);

                // Act/assert
                await Assert.ThrowsAsync<XmlSchemaException>(action);

            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task UploadSchemaFromXsd_ValidNonSeresXsd_ModelsCreated()
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            var org = "ttd";
            var sourceRepository = "empty-app-pref-json";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var xsdStream = SharedResourcesHelper.LoadTestData("Model/XmlSchema/General/SimpleValidNonSeresSchema.xsd");
                var schemaName = "SimpleValidNonSeresSchema";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await _schemaModelService.BuildSchemaFromXsd(editingContext, fileName, xsdStream);

                // Assert
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);

                Assert.False(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.metadata.json"));
                Assert.True(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json"));
                Assert.True(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.cs"));
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task UploadSchemaFromXsd_OED_ModelsCreated()
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            var org = "ttd";
            var sourceRepository = "empty-app";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var xsdStream = SharedResourcesHelper.LoadTestData("Model/XmlSchema/Gitea/OED.xsd");
                var schemaName = "OED_M";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await _schemaModelService.BuildSchemaFromXsd(editingContext, fileName, xsdStream);

                // Assert
                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);

                Assert.False(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.metadata.json"));
                Assert.True(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json"));
                Assert.True(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.xsd"));
                Assert.True(altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.cs"));
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        private static string FormatJsonString(string jsonContent)
        {
            var options = new JsonSerializerOptions { Encoder = JavaScriptEncoder.Create(UnicodeRanges.BasicLatin, UnicodeRanges.Latin1Supplement), WriteIndented = true };
            return System.Text.Json.JsonSerializer.Serialize(Json.Schema.JsonSchema.FromText(jsonContent), options);
        }
    }
}
