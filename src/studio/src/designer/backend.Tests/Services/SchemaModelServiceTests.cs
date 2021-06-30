using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services
{
    public class SchemaModelServiceTests
    {
        [Fact]
        public async Task DeleteSchema_AppRepo_ShouldDelete()
        {
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            TestDataHelper.CopyAppRepositoryForTest(org, sourceRepository, developer, targetRepository);

            ISchemaModelService schemaModelService = new SchemaModelService(new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory()));
            
            var schemaFiles = schemaModelService.GetSchemaFiles(org, targetRepository, developer);
            var schemaToDelete = schemaFiles.First(s => s.FileName == "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json");
            Assert.Equal(8, schemaFiles.Count);

            await schemaModelService.DeleteSchema(org, targetRepository, developer, schemaToDelete.RepositoryRelativeUrl);

            schemaFiles = schemaModelService.GetSchemaFiles(org, targetRepository, developer);
            Assert.Equal(6, schemaFiles.Count);
        }
    }
}
