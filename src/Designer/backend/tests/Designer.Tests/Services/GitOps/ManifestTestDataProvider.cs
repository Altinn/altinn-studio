using System.Collections.Generic;
using System.IO;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Services.GitOps;

public class ManifestTestDataProvider
{
    public static TheoryData<Dictionary<string, string>> BaseManifestsTestData =>
        [LoadManifestsFromFolder("./base/", "GitOps/Manifests/base")];

    public static TheoryData<AltinnRepoContext, Dictionary<string, string>> AppsManifestsTestData =>
        new()
        {
            {AltinnRepoContext.FromOrgRepo("ttd", "test-app"), LoadManifestsFromFolder("./apps/test-app/", "GitOps/Manifests/apps/test-app") },
            {AltinnRepoContext.FromOrgRepo("ttd", "test-app-2"), LoadManifestsFromFolder("./apps/test-app-2/", "GitOps/Manifests/apps/test-app-2") }
        };

    public static TheoryData<AltinnEnvironment, HashSet<AltinnRepoName>, Dictionary<string, string>> EnvironmentManifestsTestData =>
        new()
        {
            {AltinnEnvironment.FromName("prod"), new HashSet<AltinnRepoName>{ AltinnRepoName.FromName("test-app"), AltinnRepoName.FromName("test-app-2") }, LoadManifestsFromFolder("./prod", "GitOps/Manifests/prod") },
            {AltinnEnvironment.FromName("tt02"), new HashSet<AltinnRepoName>{ AltinnRepoName.FromName("test-app-2"), AltinnRepoName.FromName("test-app-3") }, LoadManifestsFromFolder("./tt02", "GitOps/Manifests/tt02") }
        };


    private static Dictionary<string, string> LoadManifestsFromFolder(string keysPrefix, string testDataFolderPath)
    {
        string testDataPath = TestDataHelper.GetTestDataDirectory();
        string fullPath = Path.Join(testDataPath, testDataFolderPath);
        string[] files = Directory.GetFiles(fullPath, "*", SearchOption.AllDirectories);
        var manifests = new Dictionary<string, string>();
        foreach (string file in files)
        {
            manifests[Path.Join(keysPrefix, Path.GetFileName(file))] = File.ReadAllText(file);
        }

        return manifests;
    }
}
