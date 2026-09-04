using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.Validation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services;

public class TaskDefaultDataTypeBindingValidatorTests
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task ValidateAsync_V9AppWithValidBinding_ReturnsNoErrors()
    {
        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            "app-with-layoutsets-v9",
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateAsync_MissingDefaultDataType_ReturnsError()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string settingsPath = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "ui",
            "Task_1",
            "Settings.json"
        );
        await File.WriteAllTextAsync(
            settingsPath,
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
              "pages": { "order": ["Side1"] }
            }
            """
        );

        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        KeyValuePair<string, string[]> error = Assert.Single(errors);
        Assert.Equal("taskSettings[Task_1].defaultDataType.missing", error.Key);
    }

    [Fact]
    public async Task ValidateAsync_DanglingDefaultDataType_ReturnsError()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, "app-with-layoutsets-v9", Developer, targetRepository);
        string metadataPath = Path.Combine(
            TestDataHelper.GetTestDataRepositoriesRootDirectory(),
            Developer,
            Org,
            targetRepository,
            "App",
            "config",
            "applicationmetadata.json"
        );
        await File.WriteAllTextAsync(
            metadataPath,
            """
            {
              "id": "ttd/app-with-layoutsets-v9",
              "org": "ttd",
              "title": { "nb": "app-with-layoutsets-v9" },
              "dataTypes": [],
              "partyTypesAllowed": {
                "bankruptcyEstate": true,
                "organisation": true,
                "person": true,
                "subUnit": true
              },
              "autoDeleteOnProcessEnd": false
            }
            """
        );

        TaskDefaultDataTypeBindingValidator validator = CreateValidator();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        IReadOnlyDictionary<string, string[]> errors = await validator.ValidateAsync(editingContext);

        KeyValuePair<string, string[]> error = Assert.Single(errors);
        Assert.Equal("taskSettings[Task_1].defaultDataType.notFound.model", error.Key);
    }

    private static TaskDefaultDataTypeBindingValidator CreateValidator()
    {
        string repositoriesRoot = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        return new TaskDefaultDataTypeBindingValidator(
            new AltinnGitRepositoryFactory(repositoriesRoot),
            new AppVersionService(new AltinnGitRepositoryFactory(repositoriesRoot))
        );
    }
}
