using System.Net;
using System.Text.Json;
using Altinn.App.Core.Features.Options.Altinn3LibraryCodeList;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Tests.Features.Options.Altinn3LibraryProvider;

public static class Altinn3LibraryCodeListServiceTestData
{
    public const string Value = "value1";
    public const string NbLabel = "tekst";
    public const string NbDescription = "Dette er en tekst";
    public const string NbHelpText = "Velg dette valget for å få en tekst";
    public const string EnLabel = "text";
    public const string EnDescription = "This is a text";
    public const string EnHelpText = "Choose this option to get a text";
    public const string Version = "ttd/code_lists/someNewCodeList/1.json";
    public const string SourceName = "test-data-files";

    public static Func<HttpResponseMessage> GetNbEnResponseMessage()
    {
        return () =>
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(GetNbEnAltinn3LibraryCodeListResponse()),
                    System.Text.Encoding.UTF8,
                    "application/json"
                ),
            };
    }

    public static Altinn3LibraryCodeListResponse GetNbEnAltinn3LibraryCodeListResponse()
    {
        var labels = new Dictionary<string, string> { { LanguageConst.Nb, NbLabel }, { LanguageConst.En, EnLabel } };
        var descriptions = new Dictionary<string, string>
        {
            { LanguageConst.Nb, NbDescription },
            { LanguageConst.En, EnDescription },
        };
        var helpTexts = new Dictionary<string, string>
        {
            { LanguageConst.En, EnHelpText },
            { LanguageConst.Nb, NbHelpText },
        };

        return GetAltinn3LibraryCodeListResponse(labels, descriptions, helpTexts);
    }

    public static Altinn3LibraryCodeListResponse GetAltinn3LibraryCodeListResponse(
        Dictionary<string, string> labels,
        Dictionary<string, string>? descriptions,
        Dictionary<string, string>? helpTexts,
        List<string>? tagNames = null,
        List<string>? tags = null,
        List<Altinn3LibraryCodeListItem>? additionalCodes = null
    )
    {
        additionalCodes ??= [];

        additionalCodes.Add(
            new Altinn3LibraryCodeListItem
            {
                Value = Value,
                Label = labels,
                Description = descriptions,
                HelpText = helpTexts,
                Tags = tags,
            }
        );

        return new Altinn3LibraryCodeListResponse
        {
            Codes = additionalCodes,
            Version = Version,
            TagNames = tagNames,
        };
    }
}
