using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Linq;
using System.Xml.Schema;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using FluentAssertions;
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
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var schemaFiles = schemaModelService.GetSchemaFiles(org, targetRepository, developer);
                schemaFiles.Should().HaveCount(7);

                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                var applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
                applicationMetadata.DataTypes.Should().HaveCount(2);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await schemaModelService.DeleteSchema(org, targetRepository, developer, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = schemaModelService.GetSchemaFiles(org, targetRepository, developer);
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
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var schemaFiles = schemaModelService.GetSchemaFiles(org, targetRepository, developer);
                schemaFiles.Should().HaveCount(6);

                // Act
                var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
                await schemaModelService.DeleteSchema(org, targetRepository, developer, schemaToDelete.RepositoryRelativeUrl);

                // Assert
                schemaFiles = schemaModelService.GetSchemaFiles(org, targetRepository, developer);
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
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                // Act
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var expectedSchemaUpdates = @"{""properties"":{""root"":{""$ref"":""#/definitions/rootType""}},""definitions"":{""rootType"":{""properties"":{""keyword"":{""type"":""string""}}}}}";
                await schemaModelService.UpdateSchema(org, targetRepository, developer, $"App/models/HvemErHvem_SERES.schema.json", expectedSchemaUpdates);

                // Assert
                var altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, targetRepository, developer);

                var updatedSchema = await altinnGitRepository.ReadTextByRelativePathAsync("App/models/HvemErHvem_SERES.schema.json");
                updatedSchema.Should().BeEquivalentTo(expectedSchemaUpdates);

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

                var metadataModelJson = await altinnGitRepository.ReadTextByRelativePathAsync("App/models/HvemErHvem_SERES.metadata.json");
                var jsonSchema = JsonSerializer.Deserialize<ModelMetadata>(metadataModelJson);
                jsonSchema.Org.Should().Be(org);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task CreateSchemaFromXsd_AppRepo_ShouldCreateModels()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "empty-app";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var xsdStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
                xsdStream.Seek(0, System.IO.SeekOrigin.Begin);
                var schemaName = "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await schemaModelService.CreateSchemaFromXsd(org, targetRepository, developer, relativeFilePath, xsdStream);

                // Assert
                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.metadata.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.original.xsd").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.cs").Should().BeTrue();
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task CreateSchemaFromXsdWithTexts_AppRepo_ShouldCreateTextResourceFiles()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "empty-app";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var xsdStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.Model.Xsd.Skjema-1603-12392.xsd");
                xsdStream.Seek(0, System.IO.SeekOrigin.Begin);
                var schemaName = "Skjema-1603-12392";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await schemaModelService.CreateSchemaFromXsd(org, targetRepository, developer, relativeFilePath, xsdStream);

                // Assert
                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.metadata.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.original.xsd").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.cs").Should().BeTrue();

                var textResource = await altinnAppGitRepository.GetTextResources("nb");
                textResource.Language.Should().Be("nb");
                textResource.Resources.Should().HaveCount(9);
                textResource.Resources.First(r => r.Id == "27688.KontaktpersonEPostdatadef27688.Label").Value.Should().Be("E-post");
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public async Task CreateSchemaFromXsd_DatamodelsRepo_ShouldStoreModel()
        {
            // Arrange
            var org = "ttd";
            var sourceRepository = "empty-datamodels";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var xsdStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.Model.Xsd.Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd");
                xsdStream.Seek(0, System.IO.SeekOrigin.Begin);
                var schemaName = "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES";
                var fileName = $"{schemaName}.xsd";
                var relativeDirectory = "App/models";
                var relativeFilePath = $"{relativeDirectory}/{fileName}";

                // Act
                await schemaModelService.CreateSchemaFromXsd(org, targetRepository, developer, relativeFilePath, xsdStream);

                // Assert
                var altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.schema.json").Should().BeTrue();
                altinnAppGitRepository.FileExistsByRelativePath($"{relativeDirectory}/{schemaName}.original.xsd").Should().BeTrue();
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Theory]
        [InlineData("ttd", "apprepo", "test", "", "http://altinn3.no/repos")]
        [InlineData("ttd", "apprepo", "test", "/path/to/folder/", "http://altinn3.no/repos")]
        public void GetSchemaUri_ValidNameProvided_ShouldReturnUri(string org, string repository, string schemaName, string relativePath, string repositoryBaseUrl)
        {
            var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
            var schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);

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
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory, TestDataHelper.LogFactory, TestDataHelper.ServiceRepositorySettings);
                var xsdStream = TestDataHelper.LoadDataFromEmbeddedResource("Designer.Tests._TestData.Model.Xsd.SimpleInvalidNonSeresSchema.xsd");
                var schemaName = "SimpleInvalidNonSeresSchema";
                var fileName = $"{schemaName}.xsd";

                Func<Task> action = () => schemaModelService.BuildSchemaFromXsd(org, targetRepository, developer, fileName, xsdStream);

                // Act/assert
                await action.Should().ThrowAsync<XmlSchemaException>();
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }
    }
}
