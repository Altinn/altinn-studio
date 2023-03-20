using Altinn.Codelists.SSB.Clients;

namespace Altinn.Codelists.Tests.SSB.Clients;

public class ClassificationsHttpClientTests
{
    [Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetClassificationCodes_ShouldReturnAllClassificationCodes()
    {
        var options = Options.Create(new ClassificationSettings());
        var client = new ClassificationsHttpClient(options, new HttpClient());

        var classificationCodes = await client.GetClassificationCodes(19, "nn", DateOnly.FromDateTime(DateTime.Today));

        classificationCodes.Codes.Should().HaveCountGreaterThan(2);
    }
}
