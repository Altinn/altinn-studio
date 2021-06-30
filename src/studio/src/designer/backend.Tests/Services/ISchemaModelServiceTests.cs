using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services
{
    public class ISchemaModelServiceTests
    {
        [Fact]
        public void DeleteSchema_AppRepo_ShouldDelete()
        {
            var org = "ttd";
            var repository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            var testRepositoryDirectory = TestDataHelper.CopyAppRepositoryForTest(org, repository, developer, targetRepository);

            ISchemaModelService schemaModelService = new SchemaModelService(new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory()));

            var schemaFiles = schemaModelService.GetSchemaFiles(org, repository, developer);

        }
    }
}
