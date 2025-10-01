using Altinn.Codelists.SSB.Clients;

namespace Altinn.Codelists.Tests.SSB.Clients;

public class ClassificationsHttpClientTests
{
    //[Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetClassificationCodes_ShouldReturnAllClassificationCodes()
    {
        var options = Options.Create(new ClassificationSettings());
        var client = new ClassificationsHttpClient(options, new HttpClient());

        var classificationCodes = await client.GetClassificationCodes(19, "nn", DateOnly.FromDateTime(DateTime.Today));

        Assert.True(classificationCodes.Codes.Count > 2);
    }

    //[Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetClassificationVariant_ShouldReturnAllClassificationCodeVariant()
    {
        var options = Options.Create(new ClassificationSettings());
        var client = new ClassificationsHttpClient(options, new HttpClient());

        var classificationCodes = await client.GetClassificationCodes(
            74,
            "nn",
            new DateOnly(2023, 03, 01),
            "",
            "Hønsefugler, spurvefugler og due 2023-03  - variant av Klassifisering av småvilt 2017-04"
        );

        Assert.True(classificationCodes.Codes.Count > 2);
    }
}
