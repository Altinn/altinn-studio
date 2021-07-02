using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
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

            TestDataHelper.CopyAppRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory);
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

            TestDataHelper.CopyAppRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory);
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

            TestDataHelper.CopyAppRepositoryForTest(org, sourceRepository, developer, targetRepository);
            try
            {
                var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

                // Act
                ISchemaModelService schemaModelService = new SchemaModelService(altinnGitRepositoryFactory);
                var updatedSchema = @"{""properties"":{""root"":{""$ref"":""/definitions/rootType""}},""definitions"":{""rootType"":{""keyword"":""value""}}}";
                await schemaModelService.UpdateSchema(org, targetRepository, developer, $"App/models/HvemErHvem_SERES.schema.json", updatedSchema);
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }
    }
}
