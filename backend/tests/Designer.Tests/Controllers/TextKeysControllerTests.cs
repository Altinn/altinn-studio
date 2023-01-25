using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers;

public class TextKeysControllerTests : ApiTestsBase<TextKeysController, TextKeysControllerTests>
{
    private readonly string _versionPrefix = "designer/api/v1";

    public TextKeysControllerTests(WebApplicationFactory<TextKeysController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task Get_Keys_200Ok()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "keys-management", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string list = response.Content.ReadAsStringAsync().Result;
        List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

        try
        {
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(9, keys.Count);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task GetKeys_TextsFileInvalidFormat_500InternalServerError()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "invalid-texts-format", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

        try
        {
            Assert.Equal(StatusCodes.Status500InternalServerError, (int)response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task GetKeys_TextsFilesNotFound_404NotFound()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "empty-app", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

        try
        {
            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task PutNewKey_OldKeyPresentInAllFiles_200OkAndNewKeyPresent()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "keys-management", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys?oldKey=AlreadyExistingKey&newKey=ReplacedKey";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string urlGetKeys = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage urlGetKeysRequest = new HttpRequestMessage(HttpMethod.Get, urlGetKeys);
        HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
        string list = responseGetKeys.Content.ReadAsStringAsync().Result;
        List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

        try
        {
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(7, keys.IndexOf("ReplacedKey"));
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task Put_NewKeyExistInOneFileOldKeyExistInAnotherFile_200OkAndOneLessTotalKeys()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "keys-management", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys?oldKey=KeyNotDefinedInEnglish&newKey=KeyOnlyDefinedInEnglish";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string urlGetKeys = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage urlGetKeysRequest = new HttpRequestMessage(HttpMethod.Get, urlGetKeys);
        HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
        string list = responseGetKeys.Content.ReadAsStringAsync().Result;
        List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

        try
        {
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(8, keys.Count);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task Put_NewKeyExistInSameFileAsOldKey_400BadRequestNoFilesChanged()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "keys-management", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys?oldKey=AlreadyExistingKey&newKey=KeyOnlyDefinedInEnglish";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string urlGetKeys = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage urlGetKeysRequest = new HttpRequestMessage(HttpMethod.Get, urlGetKeys);
        HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
        string list = responseGetKeys.Content.ReadAsStringAsync().Result;
        List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

        try
        {
            Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
            Assert.Contains("AlreadyExistingKey", keys);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task Put_EmptyNewKey_200OkOldKeyIsRemoved()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "keys-management", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys?oldKey=AlreadyExistingKey&newKey=";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string urlGetKeys = $"{_versionPrefix}/ttd/{targetRepository}/keys";
        HttpRequestMessage urlGetKeysRequest = new HttpRequestMessage(HttpMethod.Get, urlGetKeys);
        HttpResponseMessage responseGetKeys = await HttpClient.Value.SendAsync(urlGetKeysRequest);
        string list = responseGetKeys.Content.ReadAsStringAsync().Result;
        List<string> keys = JsonSerializer.Deserialize<List<string>>(list);

        try
        {
            Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
            Assert.Equal(8, keys.Count);
            Assert.DoesNotContain("AlreadyExistingKey", keys);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task Put_TextsFilesNotFound_404NotFound()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "empty-app", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys?oldKey=KeyNotDefinedInEnglish&newKey=KeyOnlyDefinedInEnglish";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

        try
        {
            Assert.Equal(StatusCodes.Status404NotFound, (int)response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }

    [Fact]
    public async Task Put_IllegalArguments_400BadRequest()
    {
        var targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest("ttd", "keys-management", "testUser", targetRepository);
        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/keys?wrongQueryParam=KeyNotDefinedInEnglish&newKey=KeyOnlyDefinedInEnglish";
        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);

        try
        {
            Assert.Equal(StatusCodes.Status400BadRequest, (int)response.StatusCode);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository("ttd", targetRepository, "testUser");
        }
    }
}
