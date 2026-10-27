using System.Net;
using Altinn.Codelists.SSB.Clients;
using RichardSzalay.MockHttp;

namespace Altinn.Codelists.Tests.SSB.Clients;

public class ClassificationsHttpClientFallbackTests
{
    [Theory]
    [InlineData("en", "", "codesAt")]
    [InlineData("nn", "", "codesAt")]
    [InlineData("en", "test-variant", "variantAt")]
    [InlineData("nn", "test-variant", "variantAt")]
    public async Task GetClassificationCodes_LanguageNotFound_ShouldUseBokmalFallback(
        string language,
        string variant,
        string endpoint
    )
    {
        using var mockHttp = new MockHttpMessageHandler();
        var settings = Options.Create(new ClassificationSettings());
        var url = $"{settings.Value.BaseApiUrl}2/{endpoint}";
        var filters = "&date=2026-10-16&selectLevel=1";
        if (variant != "")
        {
            filters += $"&variantName={variant}";
        }
        filters += "&selectCodes=1";
        mockHttp.Expect(url).WithExactQueryString($"language={language}{filters}").Respond(HttpStatusCode.NotFound);
        mockHttp
            .Expect(url)
            .WithExactQueryString($"language=nb{filters}")
            .Respond("application/json", """{"codes":[{"code":"1","name":"Mann","level":"1"}]}""");
        using var httpClient = mockHttp.ToHttpClient();
        var client = new ClassificationsHttpClient(settings, httpClient);

        var codes = await client.GetClassificationCodes(2, language, new DateOnly(2026, 10, 16), "1", variant, "1");

        Assert.Equal("Mann", Assert.Single(codes.Codes).Name);
        mockHttp.VerifyNoOutstandingExpectation();
    }
}
