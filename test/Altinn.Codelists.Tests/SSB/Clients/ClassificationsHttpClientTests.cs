using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.Tests.SSB.Clients;

public class ClassificationsHttpClientTests
{
    //[Fact(Skip = "This actually calls out to the api and is primarily used to test during development.")]
    [Fact]
    public async Task GetClassificationCodes_MaritalStats_ShouldReturnAllClassificationCodes()
    {
        var options = Options.Create(new ClassificationOptions());
        var client = new ClassificationsHttpClient(options, new HttpClient());

        var classificationCodes = await client.GetClassificationCodes(Classification.MaritalStatus);

        classificationCodes.Codes.Should().HaveCountGreaterThan(2);
    }
}
