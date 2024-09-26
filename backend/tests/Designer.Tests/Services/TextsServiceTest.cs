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
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class TextsServiceTest : IDisposable
{

    public string CreatedTestRepoPath { get; set; }

    private const string org = "ttd";
    private const string repository = "app-with-layoutsets";
    private const string developer = "testUser";
    private const string layoutSetName1 = "layoutSet1";
    private const string layoutSetName2 = "layoutSet2";
    private const string layoutName1 = "layoutFile1InSet1.json";
    private const string layoutName2 = "layoutFile1InSet2.json";

    private async Task<(string targetRepository, AltinnGitRepositoryFactory altinnGitRepositoryFactory, TextsService textsService)>
        SetupRepository()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        var textsService = GetTextsServiceForTest();
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repository, developer, targetRepository);
        return (targetRepository, altinnGitRepositoryFactory, textsService);
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayoutInLayoutSet_ShouldFindNewId()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString().Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_MultipleKeysExistInLayoutsAcrossLayoutSets_ShouldFindNewIdInMutlipleFiles()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout1 = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);
        JsonNode formLayout2 = await altinnAppGitRepository.GetLayout(layoutSetName2, layoutName2);

        formLayout1.Should().NotBeNull();
        formLayout2.Should().NotBeNull();
        (formLayout1["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString().Should().Be("new-id");
        (formLayout2["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString().Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyExistInLayout_ShouldFindNewId()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();
        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id", NewId = "new-id" } };

        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString().Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_KeyDoesNotExistInLayout_ShouldReturn()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "a-key-that-does-not-exist", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[0]["textResourceBindings"]["title"].ToString().Should().Be("some-old-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_WithoutNewKey_ShouldDeleteReference()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "some-old-id" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        formLayout.ToString().Should().NotContain("some-old-key");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "id-used-by-options", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["label"].ToString().Should().Be("new-id");
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["helpText"].ToString().Should().Be("help-text-used-by-options");
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["description"].ToString().Should().Be("description-used-by-options");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateHelpTextAndDescription()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "help-text-used-by-options", NewId = "new-id" }, new() { OldId = "description-used-by-options", NewId = "new-id" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["label"].ToString().Should().Be("id-used-by-options");
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["helpText"].ToString().Should().Be("new-id");
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["description"].ToString().Should().Be("new-id");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldNotDeleteOptionLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "id-used-by-options" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[2]["options"][0]["label"].ToString().Should().Be("id-used-by-options");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateOptionsList()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "label1", NewId = "label1new" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        string raw = await altinnAppGitRepository.GetOptionsList("test-options");
        JsonNode optionsList = JsonNode.Parse(raw);

        optionsList.Should().NotBeNull();
        (optionsList as JsonArray)[0]["label"].ToString().Should().Be("label1new");
        (optionsList as JsonArray)[1]["label"].ToString().Should().Be("label2");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldNotDeleteFromOptionsList()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "label1" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        string raw = await altinnAppGitRepository.GetOptionsList("test-options");
        JsonNode optionsList = JsonNode.Parse(raw);

        optionsList.Should().NotBeNull();
        (optionsList as JsonArray)[0]["label"].ToString().Should().Be("label1");
        (optionsList as JsonArray)[1]["label"].ToString().Should().Be("label2");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldUpdateSourceLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "source-label", NewId = "source-label-new" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[3]["source"]["label"].ToString().Should().Be("source-label-new");
    }

    [Fact]
    public async Task UpdateRelatedFiles_Options_ShouldNotDeleteSourceLabel()
    {
        (var targetRepository, var altinnGitRepositoryFactory, var textsService) = await SetupRepository();

        List<TextIdMutation> keyMutations = new() { new() { OldId = "source-label" } };
        await textsService.UpdateRelatedFiles(org, targetRepository, developer, keyMutations);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, targetRepository, developer);
        JsonNode formLayout = await altinnAppGitRepository.GetLayout(layoutSetName1, layoutName1);

        formLayout.Should().NotBeNull();
        (formLayout["data"]["layout"] as JsonArray)[3]["source"]["label"].ToString().Should().Be("source-label");
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
        EnvironmentsService environmentsService = new(new HttpClient(), generalSettings, new Mock<IMemoryCache>().Object, new Mock<ILogger<EnvironmentsService>>().Object);
        AltinnStorageAppMetadataClient altinnStorageAppMetadataClient = new(new HttpClient(), environmentsService, new PlatformSettings(), new Mock<ILogger<AltinnStorageAppMetadataClient>>().Object);
        ApplicationMetadataService applicationMetadataService = new(new Mock<ILogger<ApplicationMetadataService>>().Object, altinnStorageAppMetadataClient, altinnGitRepositoryFactory, new Mock<IHttpContextAccessor>().Object, new IGiteaMock());
        OptionsService optionsService = new(altinnGitRepositoryFactory);
        TextsService textsService = new(altinnGitRepositoryFactory, applicationMetadataService, optionsService);

        return textsService;
    }
}
