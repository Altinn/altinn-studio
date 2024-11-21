using System.Net;
using System.Text.Json;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.Models;

namespace Altinn.App.Core.Tests.Features.Correspondence;

public static class TestHelpers
{
    public static OrganisationNumber GetOrganisationNumber(int index)
    {
        var i = index % OrganisationNumberTests.ValidOrganisationNumbers.Length;
        return OrganisationNumber.Parse(OrganisationNumberTests.ValidOrganisationNumbers[i]);
    }

    public static NationalIdentityNumber GetNationalIdentityNumber(int index)
    {
        var i = index % NationalIdentityNumberTests.ValidNationalIdentityNumbers.Length;
        return NationalIdentityNumber.Parse(NationalIdentityNumberTests.ValidNationalIdentityNumbers[i]);
    }

    public static HttpContent? GetItem(this MultipartFormDataContent content, string name)
    {
        return content.FirstOrDefault(item => item.Headers.ContentDisposition?.Name?.Trim('\"') == name);
    }

    public static HttpResponseMessage ResponseMessageFactory<T>(
        T content,
        HttpStatusCode statusCode = HttpStatusCode.OK
    )
    {
        string test = content as string ?? JsonSerializer.Serialize(content);

        return new HttpResponseMessage(statusCode) { Content = new StringContent(test) };
    }
}
