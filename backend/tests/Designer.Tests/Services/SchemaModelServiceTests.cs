using System;
using System.Collections.Generic;
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
using FluentAssertions;
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
                schemaFiles.Should().HaveCount(7);

                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                applicationMetadata.DataTypes.Should().HaveCount(2);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await _schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                schemaFiles.Should().HaveCount(6);
                applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                applicationMetadata.DataTypes.Should().HaveCount(1);
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
                schemaFiles.Should().HaveCount(1);

                var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                var applicationMetadataBefore = await altinnAppGitRepository.GetApplicationMetadata();
                var layoutSetsBefore = await altinnAppGitRepository.GetLayoutSetsFile();

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == $"{dataModelName}.schema.json");
                await _schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                schemaFiles.Should().HaveCount(0);
                var applicationMetadataAfter = await altinnAppGitRepository.GetApplicationMetadata();
                applicationMetadataAfter.DataTypes.Should().HaveCount(applicationMetadataBefore.DataTypes.Count - 1);
                var layoutSetsAfter = await altinnAppGitRepository.GetLayoutSetsFile();
                layoutSetsBefore.Sets.Exists(set => set.DataType == dataModelName).Should().BeTrue();
                layoutSetsAfter.Sets.Exists(set => set.DataType == dataModelName).Should().BeFalse();
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
            var sourceRepository = "xyz-datamodels";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, targetRepository, developer);

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {

                var schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                schemaFiles.Should().HaveCount(6);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await _schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = _schemaModelService.GetSchemaFiles(editingContext);
                schemaFiles.Should().HaveCount(5);
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
                updatedSchema.Should().BeEquivalentTo(serializedExpectedSchemaUpdates);

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
                xsdSchema.Root.Should().NotBeNull();
                xsdSchema.Root.Elements().First().Attributes().First(a => a.Name.LocalName == "name").Should().HaveValue("root");
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
                updatedSchema.Should().BeEquivalentTo(serializedExpectedSchemaUpdates);
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
            exception.CustomErrorMessages.Should().ContainSingle(c => c.Contains("root': member names cannot be the same as their enclosing type"));
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
                await action.Should().ThrowAsync<XmlSchemaException>();
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
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.metadata.json").Should().BeFalse();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.cs").Should().BeTrue();
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
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.metadata.json").Should().BeFalse();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.xsd").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.cs").Should().BeTrue();
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
