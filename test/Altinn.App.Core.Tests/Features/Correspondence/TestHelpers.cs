using System.Net;
using System.Text.Json;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Features.Correspondence;

public static class TestHelpers
{
    public static OrganisationNumber GetOrganisationNumber(int index) =>
        IdentificationNumberProvider.OrganisationNumbers.GetValidNumber(index);

    public static NationalIdentityNumber GetNationalIdentityNumber(int index) =>
        IdentificationNumberProvider.NationalIdentityNumbers.GetValidNumber(index);

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
