using System.Net;
using System.Text.Json;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public static class Altinn3LibraryOptionsProviderTestData
{
    public static Func<HttpResponseMessage> GetNbEnResponseMessage()
    {
        var labels = new Dictionary<string, string> { { "nb", "tekst" }, { "en", "text" } };
        var descriptions = new Dictionary<string, string> { { "nb", "Dette er en tekst" }, { "en", "This is a text" } };
        var helpTexts = new Dictionary<string, string>
        {
            { "en", "Choose this option to get a text" },
            { "nb", "Velg dette valget for å få en tekst" },
        };
        return GetResponseMessage(labels, descriptions, helpTexts);
    }

    public static Func<HttpResponseMessage> GetResponseMessage(
        Dictionary<string, string>? labels,
        Dictionary<string, string>? descriptions,
        Dictionary<string, string>? helpTexts
    )
    {
        return () =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $$"""{"codes": [{"value": "value1","label": {{JsonSerializer.Serialize(labels)}},"description": {{JsonSerializer.Serialize(descriptions)}},"helpText": {{JsonSerializer.Serialize(helpTexts)}},"tags": ["test-data"]}],"version": "ttd/code_lists/someNewCodeList/1.json","source": {"name": "test-data-files"},"tagNames": ["test-data-category"]}""",
                    System.Text.Encoding.UTF8,
                    "application/json"
                ),
            };
    }
}
