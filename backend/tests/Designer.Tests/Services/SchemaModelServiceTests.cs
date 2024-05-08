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
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services
{
    public class SchemaModelServiceTests
    {
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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var schemaFiles = schemaModelService.GetSchemaFiles(editingContext);
                schemaFiles.Should().HaveCount(7);

                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                applicationMetadata.DataTypes.Should().HaveCount(2);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = schemaModelService.GetSchemaFiles(editingContext);
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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var schemaFiles = schemaModelService.GetSchemaFiles(editingContext);
                schemaFiles.Should().HaveCount(6);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await schemaModelService.DeleteSchema(editingContext, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = schemaModelService.GetSchemaFiles(editingContext);
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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                // Act
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var expectedSchemaUpdates = @"{""properties"":{""rootType1"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";
                await schemaModelService.UpdateSchema(editingContext, "App/models/HvemErHvem_SERES.schema.json", expectedSchemaUpdates);

                // Assert
                var altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);

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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var updatedSchema = @"{""properties"":{""rootType1"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";

                var altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);
                Assert.True(altinnGitRepository.FileExistsByRelativePath("App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.metadata.json"));
                await schemaModelService.UpdateSchema(editingContext, "App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json", updatedSchema);
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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var expectedUpdatedSchema = @"{""properties"":{""rootType1"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";
                var altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);
                Assert.False(altinnGitRepository.FileExistsByRelativePath("App/models/HvemErHvem_SERES.metadata.json"));

                await schemaModelService.UpdateSchema(editingContext, "App/models/HvemErHvem_SERES.schema.json", expectedUpdatedSchema);
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

            var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

            ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory,
                TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings,
                TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter,
                TestDataHelper.ModelMetadataToCsharpConverter);
            var invalidSchema =
                @"{""properties"":{""root"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";

            var exception = await Assert.ThrowsAsync<CsharpCompilationException>(async () =>
            {
                await schemaModelService.UpdateSchema(editingContext, "App/models/HvemErHvem_SERES.schema.json", invalidSchema);
            });

            Assert.NotNull(exception.CustomErrorMessages);
            exception.CustomErrorMessages.Should().ContainSingle(c => c.Contains("root': member names cannot be the same as their enclosing type"));
        }

        [Theory]
        [InlineData("ttd", "apprepo", "test", "", "http://studio.localhost/repos")]
        [InlineData("ttd", "apprepo", "test", "/path/to/folder/", "http://studio.localhost/repos")]
        public void GetSchemaUri_ValidNameProvided_ShouldReturnUri(string org, string repository, string schemaName, string relativePath, string repositoryBaseUrl)
        {
            var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            var schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);

            var schemaUri = schemaModelService.GetSchemaUri(org, repository, schemaName, relativePath);

            schemaUri.AbsoluteUri.Should().Be($"{repositoryBaseUrl}/{org}/{repository}{(string.IsNullOrEmpty(relativePath) ? "/" : relativePath)}{schemaName}.schema.json");
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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var xsdStream = SharedResourcesHelper.LoadTestData("Model/XmlSchema/General/SimpleInvalidNonSeresSchema.xsd");
                var schemaName = "SimpleInvalidNonSeresSchema";
                var fileName = $"{schemaName}.xsd";

                Func<Task> action = () => schemaModelService.BuildSchemaFromXsd(editingContext, fileName, xsdStream);

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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var xsdStream = SharedResourcesHelper.LoadTestData("Model/XmlSchema/General/SimpleValidNonSeresSchema.xsd");
                var schemaName = "SimpleValidNonSeresSchema";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await schemaModelService.BuildSchemaFromXsd(editingContext, fileName, xsdStream);

                // Assert
                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
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
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings, TestDataHelper.XmlSchemaToJsonSchemaConverter, TestDataHelper.JsonSchemaToXmlSchemaConverter, TestDataHelper.ModelMetadataToCsharpConverter);
                var xsdStream = SharedResourcesHelper.LoadTestData("Model/XmlSchema/Gitea/OED.xsd");
                var schemaName = "OED_M";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await schemaModelService.BuildSchemaFromXsd(editingContext, fileName, xsdStream);

                // Assert
                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
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
