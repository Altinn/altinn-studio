using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Codelists.Posten.Clients;
using Altinn.Codelists.SSB.Clients;
using Altinn.Codelists.SSB.Models;

namespace Altinn.Codelists.Tests.Posten.Clients;

public class PostalCodesHttpClientTests
{
    //[Fact(Skip = "Disabled. This actually calls out to the api and is primarily used to test during development.")]
    public async Task GetPostalCodes_ShouldReturnAllCurrentCodes()
    {
        var client = new PostalCodesHttpClient(new HttpClient());

        var postalCodes = await client.GetPostalCodes();

        Assert.True(postalCodes.Count > 3);
    }
}
