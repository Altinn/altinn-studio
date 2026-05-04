using System.Net;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class OptionsControllerTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    public OptionsControllerTests(ITestOutputHelper outputHelper, WebApplicationFactory<Program> factory)
        : base(factory, outputHelper) { }

    [Fact]
    public async Task Get_ShouldReturnParametersInHeader()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IAppOptionsProvider, DummyProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/test?language=esperanto";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters").Single();
        Assert.Contains("lang=esperanto", headerValue);
    }

    [Fact]
    public async Task Get_ShouldReturnParametersInHeaderWithSpecialChars()
    {
        var options = new AppOptions
        {
            Options = new List<AppOption>()
            {
                new() { Value = "", Label = "" },
            },
            Parameters = new Dictionary<string, string?>
            {
                { "language", "español" },
                { "level", "1" },
                { "variant", "Småviltjakt" },
                { "special", ",\".%" },
            },
        };
        var provider = new Mock<IAppOptionsProvider>(MockBehavior.Strict);
        provider
            .Setup(p => p.GetAppOptionsAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(options)
            .Verifiable(Times.Once);
        provider.Setup(p => p.Id).Returns("test").Verifiable(Times.Once);

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(provider.Object);
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/test?";
        HttpResponseMessage response = await client.GetAsync(url);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.Contains("Altinn-DownstreamParameters", response.Headers.Select(x => x.Key));
        var headerValue = response.Headers.Single((header) => header.Key == "Altinn-DownstreamParameters").Value;

        Assert.Single(headerValue);
        var splitHeader = headerValue.Single().Split(',');
        var expectedHeaderValues = new[]
        {
            "language=espa%C3%B1ol",
            "level=1",
            "variant=Sm%C3%A5viltjakt",
            "special=%2C%22.%25",
        };

        foreach (var expected in expectedHeaderValues)
        {
            Assert.Contains(expected, splitHeader);
        }
        provider.Verify();
    }

    [Fact]
    public async Task Get_ShouldNotDefaultToNbLanguage()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IAppOptionsProvider, DummyProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/test";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters").Single();
        Assert.DoesNotContain($"lang={LanguageConst.Nb}", headerValue, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Get_ShouldWorkWithFileSource()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/fileSourceOptions";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            """[{"value":null,"label":""},{"value":"string-value","label":"string-label"},{"value":3,"label":"number"},{"value":true,"label":"boolean-true"},{"value":false,"label":"boolean-false"}]""",
            content
        );
    }

    [Fact]
    public async Task Get_NonExistentList_ShouldReturn404()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/non-existent-option-list";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Get_InstanceOptionsWasFound_ShouldReturn404WithMessage()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IInstanceAppOptionsProvider, DummyInstanceProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/testInstance";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(
            "An instance app options provider was found. "
                + "Call the options endpoint that requires instanceOwnerPartyId and instanceId instead to retrieve them.",
            content
        );
    }

    [Fact]
    public async Task Get_ShouldSerializeToCorrectTypes()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IAppOptionsProvider, DummyProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);

        string url = $"/{org}/{app}/api/options/test";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "[{\"value\":null,\"label\":\"\"},{\"value\":\"SomeString\",\"label\":\"False\"},{\"value\":true,\"label\":\"True\"},{\"value\":0,\"label\":\"Zero\"},{\"value\":1,\"label\":\"One\",\"description\":\"This is a description\",\"helpText\":\"This is a help text\"}]",
            content
        );
    }

    [Fact]
    public async Task Get_ShouldSerializeToCorrectTypesFromAltinn3LibraryCodeListService()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IAltinn3LibraryCodeListService, DummyAltinn3LibraryCodeListService>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);
        var altinn3LibraryCodeListService = (DummyAltinn3LibraryCodeListService)
            Services.GetRequiredService<IAltinn3LibraryCodeListService>();

        string url = $"/{org}/{app}/api/options/lib**ttd**someNewCodeListId**latest";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);

        Assert.Equal(1, altinn3LibraryCodeListService.CallCounter);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Altinn-DownstreamParameters", response.Headers.Select(x => x.Key));

        var downstreamHeader = response.Headers.Single(x => x.Key == "Altinn-DownstreamParameters").Value.Single();
        var downstreamParameters = downstreamHeader.Split(',');

        Assert.Contains("version=1", downstreamParameters);
        Assert.Single(downstreamParameters);
        Assert.Equal(
            "[{\"value\":\"Value1\",\"label\":\"En label\",\"description\":\"En beskrivelse\",\"helpText\":\"En hjelpetekst\",\"tags\":{\"test-tag-name\":\"test-tag\"}}]",
            content
        );
    }

    [Theory]
    [InlineData("**ttd**CodeListId**1.0")] // Missing lib prefix
    [InlineData("lib****Municipalities**1")] // Missing org
    [InlineData("lib**ttd****1")] // Missing code list id
    [InlineData("lib**ttd**SomeCodeListId**")] // Missing version
    [InlineData("lib**ttd**CodeList With Space**1.0")] // Space in codeListId (invalid)
    [InlineData("lib**tt d**CodeListId**1.0")] // Space in org (invalid)
    [InlineData("lib**ttd**CodeListId**1 .0")] // Space in version (invalid)
    [InlineData("lib**ttd-org**CodeListId**1.0")] // Dash in org (invalid - only alphanumeric allowed)
    [InlineData("lib**ttd**CodeList@Id**1.0")] // Special char @ in codeListId (invalid)
    [InlineData("lib**ttd**CodeListId**v1.0@")] // Special char @ in version (invalid)
    [InlineData("libttd**CodeListId**1.0")] // Missing separator after lib
    [InlineData("lib**ttd**CodeListId*1.0")] // Wrong number of asterisks before version
    public async Task Get_ShouldNotMatchLibraryRefRegex(string optionsIdOrLibraryRef)
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IAltinn3LibraryCodeListService, DummyAltinn3LibraryCodeListService>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);
        var altinn3LibraryCodeListService = (DummyAltinn3LibraryCodeListService)
            Services.GetRequiredService<IAltinn3LibraryCodeListService>();

        string url = $"/{org}/{app}/api/options/{optionsIdOrLibraryRef}";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(0, altinn3LibraryCodeListService.CallCounter);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("lib**ttd**SomeCodeListId**latest")] // With version "latest"
    [InlineData("lib**ttd**SomeCodeListId**1")] // With numeric version
    [InlineData("lib**digdir**PostalCodes**2.0")] // Different org, semantic version
    [InlineData("lib**nav**CountryCodes**v1.5.3")] // With 'v' prefix in version
    [InlineData("lib**skd**Municipalities**20231201")] // Date-based version
    [InlineData("lib**ttd**Code_List_With_Underscores**1.0")] // Underscores in codeListId
    [InlineData("lib**ttd**code-list-with-dashes**2.0")] // Dashes in codeListId
    [InlineData("lib**ttd**CodeList123**1.0")] // Numbers in codeListId
    [InlineData("lib**TTD**CodeListId**1.0")] // Uppercase in org
    [InlineData("lib**Org123**CodeListId**1.0")] // Numbers in org
    public async Task Get_ShouldMatchLibraryRefRegexAndCallAltinn3LibraryCodeListService(string optionsIdOrLibraryRef)
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IAltinn3LibraryCodeListService, DummyAltinn3LibraryCodeListService>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        HttpClient client = GetRootedClient(org, app);
        var altinn3LibraryCodeListService = (DummyAltinn3LibraryCodeListService)
            Services.GetRequiredService<IAltinn3LibraryCodeListService>();

        string url = $"/{org}/{app}/api/options/{optionsIdOrLibraryRef}";
        HttpResponseMessage response = await client.GetAsync(url);
        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);

        Assert.Equal(1, altinn3LibraryCodeListService.CallCounter);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetInstance_ShouldReturnParametersInHeader()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IInstanceAppOptionsProvider, DummyInstanceProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url =
            $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/testInstance?language=esperanto";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters").Single();
        Assert.Contains("lang=esperanto", headerValue);
    }

    [Fact]
    public async Task GetInstance_ShouldReturnParametersInHeaderWithSpecialChars()
    {
        var options = new AppOptions
        {
            Options = new List<AppOption>()
            {
                new() { Value = "", Label = "" },
            },
            Parameters = new Dictionary<string, string?>
            {
                { "language", "español" },
                { "level", "1" },
                { "variant", "Småviltjakt" },
                { "special", ",\".%" },
            },
        };
        var provider = new Mock<IInstanceAppOptionsProvider>(MockBehavior.Strict);
        provider
            .Setup(p =>
                p.GetInstanceAppOptionsAsync(
                    It.IsAny<InstanceIdentifier>(),
                    It.IsAny<string>(),
                    It.IsAny<Dictionary<string, string>>()
                )
            )
            .ReturnsAsync(options)
            .Verifiable(Times.Once);
        provider.Setup(p => p.Id).Returns("test").Verifiable(Times.Once);

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(provider.Object);
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/test?";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Assert.Contains("Altinn-DownstreamParameters", response.Headers.Select(x => x.Key));
        var headerValue = response.Headers.Single((header) => header.Key == "Altinn-DownstreamParameters").Value;

        Assert.Single(headerValue);
        var splitHeader = headerValue.Single().Split(',');
        var expectedHeaderValues = new[]
        {
            "language=espa%C3%B1ol",
            "level=1",
            "variant=Sm%C3%A5viltjakt",
            "special=%2C%22.%25",
        };

        foreach (var expected in expectedHeaderValues)
        {
            Assert.Contains(expected, splitHeader);
        }
        provider.Verify();
    }

    [Fact]
    public async Task GetInstance_ShouldDefaultToNbLanguage()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IInstanceAppOptionsProvider, DummyInstanceProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/testInstance";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var headerValue = response.Headers.GetValues("Altinn-DownstreamParameters").Single();
        Assert.Contains($"lang={LanguageConst.Nb}", headerValue, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetInstance_NonExistentList_ShouldReturn404()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/non-existent-option-list";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetInstance_ShouldSerializeToCorrectTypes()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddTransient<IInstanceAppOptionsProvider, DummyInstanceProvider>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/testInstance";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "[{\"value\":null,\"label\":\"\"},{\"value\":\"SomeString\",\"label\":\"False\"},{\"value\":true,\"label\":\"True\"},{\"value\":0,\"label\":\"Zero\"},{\"value\":1,\"label\":\"One\",\"description\":\"This is a description\",\"helpText\":\"This is a help text\"}]",
            content
        );
    }

    [Fact]
    public async Task GetInstance_ShouldCallAppOptionsProvider()
    {
        var options = TestDataOptionsController.GetAppOptions("nb");
        var providerMock = new Mock<IAppOptionsProvider>(MockBehavior.Strict);
        providerMock
            .Setup(p => p.GetAppOptionsAsync(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(options)
            .Verifiable(Times.Once);
        providerMock.Setup(p => p.Id).Returns("test").Verifiable(Times.Once);

        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(providerMock.Object);
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/test?language=esperanto";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        providerMock.Verify();
    }

    // Creates DefaultAppOptionsProvider through AppOptionsFactory
    [Fact]
    public async Task GetInstance_ShouldWorkWithFileSourceFromAppOptionsProvider()
    {
        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/fileSourceOptions";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            """[{"value":null,"label":""},{"value":"string-value","label":"string-label"},{"value":3,"label":"number"},{"value":true,"label":"boolean-true"},{"value":false,"label":"boolean-false"}]""",
            content
        );
    }

    [Fact]
    public async Task GetInstance_ShouldFetchAltinn3LibraryCodeListsDirectly()
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IAltinn3LibraryCodeListService, DummyAltinn3LibraryCodeListService>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);
        var altinn3LibraryCodeListService = (DummyAltinn3LibraryCodeListService)
            Services.GetRequiredService<IAltinn3LibraryCodeListService>();

        string url =
            $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/lib**ttd**someNewCodeListId**latest";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);

        Assert.Equal(1, altinn3LibraryCodeListService.CallCounter);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Altinn-DownstreamParameters", response.Headers.Select(x => x.Key));

        var downstreamHeader = response.Headers.Single(x => x.Key == "Altinn-DownstreamParameters").Value.Single();
        var downstreamParameters = downstreamHeader.Split(',');

        Assert.Contains("version=1", downstreamParameters);
        Assert.Single(downstreamParameters);
        Assert.Equal(
            "[{\"value\":\"Value1\",\"label\":\"En label\",\"description\":\"En beskrivelse\",\"helpText\":\"En hjelpetekst\",\"tags\":{\"test-tag-name\":\"test-tag\"}}]",
            content
        );
    }

    [Theory]
    [InlineData("**ttd**CodeListId**1.0")] // Missing lib prefix
    [InlineData("lib****Municipalities**1")] // Missing org
    [InlineData("lib**ttd****1")] // Missing code list id
    [InlineData("lib**ttd**SomeCodeListId**")] // Missing version
    [InlineData("lib**ttd**CodeList With Space**1.0")] // Space in codeListId (invalid)
    [InlineData("lib**tt d**CodeListId**1.0")] // Space in org (invalid)
    [InlineData("lib**ttd**CodeListId**1 .0")] // Space in version (invalid)
    [InlineData("lib**ttd-org**CodeListId**1.0")] // Dash in org (invalid - only alphanumeric allowed)
    [InlineData("lib**ttd**CodeList@Id**1.0")] // Special char @ in codeListId (invalid)
    [InlineData("lib**ttd**CodeListId**v1.0@")] // Special char @ in version (invalid)
    [InlineData("libttd**CodeListId**1.0")] // Missing separator after lib
    [InlineData("lib**ttd**CodeListId*1.0")] // Wrong number of asterisks before version
    public async Task GetInstance_ShouldNotMatchLibraryRefRegex(string optionsIdOrLibraryRef)
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IAltinn3LibraryCodeListService, DummyAltinn3LibraryCodeListService>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);
        var altinn3LibraryCodeListService = (DummyAltinn3LibraryCodeListService)
            Services.GetRequiredService<IAltinn3LibraryCodeListService>();

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/{optionsIdOrLibraryRef}";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);
        Assert.Equal(0, altinn3LibraryCodeListService.CallCounter);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("lib**ttd**SomeCodeListId**latest")] // With version "latest"
    [InlineData("lib**ttd**SomeCodeListId**1")] // With numeric version
    [InlineData("lib**digdir**PostalCodes**2.0")] // Different org, semantic version
    [InlineData("lib**nav**CountryCodes**v1.5.3")] // With 'v' prefix in version
    [InlineData("lib**skd**Municipalities**20231201")] // Date-based version
    [InlineData("lib**ttd**Code_List_With_Underscores**1.0")] // Underscores in codeListId
    [InlineData("lib**ttd**code-list-with-dashes**2.0")] // Dashes in codeListId
    [InlineData("lib**ttd**CodeList123**1.0")] // Numbers in codeListId
    [InlineData("lib**TTD**CodeListId**1.0")] // Uppercase in org
    [InlineData("lib**Org123**CodeListId**1.0")] // Numbers in org
    public async Task GetInstance_ShouldMatchLibraryRefRegexAndCallAltinn3LibraryCodeListService(
        string optionsIdOrLibraryRef
    )
    {
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton<IAltinn3LibraryCodeListService, DummyAltinn3LibraryCodeListService>();
        };

        string org = "tdd";
        string app = "contributer-restriction";
        int instanceOwnerPartyId = 500600;
        Guid instanceGuid = Guid.Parse("cff1cb24-5bc1-4888-8e06-c634753c5144");
        HttpClient client = GetRootedUserClient(org, app, 1337, instanceOwnerPartyId);
        TestData.PrepareInstance(org, app, instanceOwnerPartyId, instanceGuid);
        var altinn3LibraryCodeListService = (DummyAltinn3LibraryCodeListService)
            Services.GetRequiredService<IAltinn3LibraryCodeListService>();

        string url = $"/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/options/{optionsIdOrLibraryRef}";
        HttpResponseMessage response = await client.GetAsync(url);

        // Cleanup testdata
        TestData.DeleteInstanceAndData(org, app, 1337, instanceGuid);

        var content = await response.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(content);

        Assert.Equal(1, altinn3LibraryCodeListService.CallCounter);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

internal sealed class DummyAltinn3LibraryCodeListService : IAltinn3LibraryCodeListService
{
    public int CallCounter { get; set; }

    private readonly Altinn3LibraryCodeListResponse _codeListResponse = new()
    {
        Codes = new List<Altinn3LibraryCodeListItem>()
        {
            new()
            {
                Value = "Value1",
                Label = new Dictionary<string, string>() { { LanguageConst.Nb, "En label" } },
                Description = new Dictionary<string, string>() { { LanguageConst.Nb, "En beskrivelse" } },
                HelpText = new Dictionary<string, string>() { { LanguageConst.Nb, "En hjelpetekst" } },
                Tags = ["test-tag"],
            },
        },
        Version = "1",
        TagNames = ["test-tag-name"],
    };

    public Task<Altinn3LibraryCodeListResponse> GetCachedCodeListResponseAsync(
        string org,
        string codeListId,
        string? version,
        CancellationToken cancellationToken
    )
    {
        return Task.FromResult(_codeListResponse);
    }

    // This is a fake implementation, used for testing the controller behavior
    public AppOptions MapAppOptions(Altinn3LibraryCodeListResponse libraryCodeListResponse, string? language)
    {
        var responseOptionOne = libraryCodeListResponse.Codes.First();
        return new AppOptions()
        {
            Parameters = new() { { "version", libraryCodeListResponse.Version } },
            Options = new()
            {
                new()
                {
                    Value = responseOptionOne.Value,
                    Label = responseOptionOne.Label[LanguageConst.Nb],
                    Description = responseOptionOne.Description?[LanguageConst.Nb],
                    HelpText = responseOptionOne.HelpText?[LanguageConst.Nb],
                    Tags =
                        libraryCodeListResponse.TagNames is { Count: > 0 } && responseOptionOne.Tags is { Count: > 0 }
                            ? new Dictionary<string, string>
                            {
                                { libraryCodeListResponse.TagNames.First(), responseOptionOne.Tags.First() },
                            }
                            : null,
                },
            },
        };
    }

    public async Task<AppOptions> GetAppOptionsAsync(
        string org,
        string codeListId,
        string version,
        string? language,
        CancellationToken cancellationToken
    )
    {
        CallCounter++;
        var response = await GetCachedCodeListResponseAsync(org, codeListId, version, cancellationToken);
        return MapAppOptions(response, language);
    }
}

internal sealed class DummyInstanceProvider : IInstanceAppOptionsProvider
{
    public string Id => "testInstance";

    public Task<AppOptions> GetInstanceAppOptionsAsync(
        InstanceIdentifier instanceIdentifier,
        string? language,
        Dictionary<string, string> keyValuePairs
    )
    {
        return Task.FromResult(TestDataOptionsController.GetAppOptions(language));
    }
}

internal sealed class DummyProvider : IAppOptionsProvider
{
    public string Id => "test";

    public Task<AppOptions> GetAppOptionsAsync(string? language, Dictionary<string, string> keyValuePairs)
    {
        return Task.FromResult(TestDataOptionsController.GetAppOptions(language));
    }
}

internal static class TestDataOptionsController
{
    public static AppOptions GetAppOptions(string? language)
    {
        return new AppOptions()
        {
            Parameters = new() { { "lang", language } },
            Options = new List<AppOption>()
            {
                new() { Value = null, Label = "" },
                new() { Value = "SomeString", Label = "False" },
                new()
                {
                    Value = "true",
                    ValueType = AppOptionValueType.Boolean,
                    Label = "True",
                },
                new()
                {
                    Value = "0",
                    ValueType = AppOptionValueType.Number,
                    Label = "Zero",
                },
                new()
                {
                    Value = "1",
                    ValueType = AppOptionValueType.Number,
                    Label = "One",
                    Description = "This is a description",
                    HelpText = "This is a help text",
                },
            },
        };
    }
}
