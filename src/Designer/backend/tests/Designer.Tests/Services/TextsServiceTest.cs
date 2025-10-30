#nullable disable
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class TextsServiceTest : IDisposable
{

    public string CreatedTestRepoPath { get; set; }

    private const string Org = "ttd";
    private const string Repository = "app-with-layoutsets";
    private const string Developer = "testUser";
    private const string LayoutSetName1 = "layoutSet1";
    private const string LayoutSetName2 = "layoutSet2";
    private const string LayoutName1 = "layoutFile1InSet1";
    private const string LayoutName2 = "layoutFile1InSet2";

    private async Task<(string targetRepository, AltinnGitRepositoryFactory altinnGitRepositoryFactory, TextsService textsService)>
        SetupRepository()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        var textsService = GetTextsServiceForTest();
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repository, Developer, targetRepository);
        return (targetRepository, altinnGitRepositoryFactory, textsService);
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayoutInLayoutSet_ShouldFindNewId()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("new-id", (formLayout["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_MultipleKeysExistInLayoutsAcrossLayoutSets_ShouldFindNewIdInMutlipleFiles()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout1 = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);
        JsonNode formLayout2 = await altinnAppGitRepository.GetLayout(LayoutSetName2, LayoutName2);

        Assert.NotNull(formLayout1);
        Assert.NotNull(formLayout2);
        Assert.Equal("new-id", (formLayout1["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString());
        Assert.Equal("new-id", (formLayout2["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayout_ShouldFindNewId()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();
        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("new-id", (formLayout["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyDoesNotExistInLayout_ShouldReturn()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "a-key-that-does-not-exist", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("some-old-id", (formLayout["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_WithoutNewKey_ShouldDeleteReference()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.DoesNotContain("some-old-key", formLayout.ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "id-used-by-options", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("new-id", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["label"].ToString());
        Assert.Equal("help-text-used-by-options", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["helpText"].ToString());
        Assert.Equal("description-used-by-options", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["description"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateHelpTextAndDescription()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "help-text-used-by-options", NewId = "new-id" }, new() { OldId = "description-used-by-options", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("id-used-by-options", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["label"].ToString());
        Assert.Equal("new-id", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["helpText"].ToString());
        Assert.Equal("new-id", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["description"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldNotDeleteOptionLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "id-used-by-options" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("id-used-by-options", (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["label"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateOptionsList()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "label1", NewId = "label1new" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        string raw = await altinnAppGitRepository.GetOptionsList("test-options");
        JsonNode optionsList = JsonNode.Parse(raw);

        Assert.NotNull(optionsList);
        Assert.Equal("label1new", (optionsList as JsonArray)[0]["label"].ToString());
        Assert.Equal("label2", (optionsList as JsonArray)[1]["label"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldNotDeleteFromOptionsList()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "label1" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        string raw = await altinnAppGitRepository.GetOptionsList("test-options");
        JsonNode optionsList = JsonNode.Parse(raw);

        Assert.NotNull(optionsList);
        Assert.Equal("label1", (optionsList as JsonArray)[0]["label"].ToString());
        Assert.Equal("label2", (optionsList as JsonArray)[1]["label"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateSourceLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "source-label", NewId = "source-label-new" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("source-label-new", (formLayout["data"]["layout"] as JsonArray)[3]["source"]["label"].ToString());
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldNotDeleteSourceLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "source-label" } };
        await textsService.UpdateRelatedFiles(Org, targetRepository, Developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(Org, targetRepository, Developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(LayoutSetName1, LayoutName1);

        Assert.NotNull(formLayout);
        Assert.Equal("source-label", (formLayout["data"]["layout"] as JsonArray)[3]["source"]["label"].ToString());
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(CreatedTestRepoPath))
        {
            TestDataHelper.DeleteDirectory(CreatedTestRepoPath);
        }
    }

    private static TextsService GetTextsServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        GeneralSettings generalSettings = new()
        {
            TemplateLocation = @"../../../../../../testdata/AppTemplates/AspNet",
            DeploymentLocation = @"../../../../../../testdata/AppTemplates/AspNet/deployment",
            AppLocation = @"../../../../../../testdata/AppTemplates/AspNet/App"
        };
        PlatformSettings platformSettings = new()
        {
            AppClusterUrlPattern = "https://{org}.{appPrefix}.{hostName}",
        };
        EnvironmentsService environmentsService = new(new HttpClient(), generalSettings, platformSettings, new Mock<IMemoryCache>().Object, new Mock<ILogger<EnvironmentsService>>().Object);
        AltinnStorageAppMetadataClient altinnStorageAppMetadataClient = new(new HttpClient(), environmentsService, new PlatformSettings(), new Mock<ILogger<AltinnStorageAppMetadataClient>>().Object);
        IGitea giteaMock = new IGiteaMock();
        ApplicationMetadataService applicationMetadataService = new(new Mock<ILogger<ApplicationMetadataService>>().Object, altinnStorageAppMetadataClient, altinnGitRepositoryFactory, new Mock<IHttpContextAccessor>().Object, giteaMock);
        Mock<ILogger<GiteaContentLibraryService>> loggerMock = new();
        OptionsService optionsService = new(altinnGitRepositoryFactory, new GiteaContentLibraryService(giteaMock, loggerMock.Object));
        TextsService textsService = new(altinnGitRepositoryFactory, applicationMetadataService, optionsService);

        return textsService;
    }
}
