using Altinn.Platform.Storage.Interface.Models;
using static Altinn.App.Integration.Tests.AppFixture;

namespace Altinn.App.Integration.Tests;

public sealed record Scrubbers(
    Func<string, string>? StringScrubber = null,
    Func<(string Key, IEnumerable<string> Values), (string Key, IEnumerable<string> Values)?>? HeadersScrubber = null
)
{
    public Scrubbers WithStringScrubber(Func<string, string> scrubber)
    {
        var stringScrubber = StringScrubber is not null ? v => scrubber(StringScrubber(v)) : scrubber;
        return this with { StringScrubber = stringScrubber };
    }

    public Scrubbers WithHeadersScrubber(
        Func<(string Key, IEnumerable<string> Values), (string Key, IEnumerable<string> Values)?> scrubber
    )
    {
        var headersScrubber = HeadersScrubber is not null ? kvp => scrubber(HeadersScrubber(kvp) ?? kvp) : scrubber;
        return this with { HeadersScrubber = headersScrubber };
    }

    // A scrubber function that replaces information part of an instance that is not stable across test runs
    public static Func<string, string> InstanceStringScrubber(Instance instance) =>
        v =>
        {
            v = v.Replace(instance.Id.Split('/')[1], "<instanceGuid>");
            for (int i = 0; i < instance.Data.Count; i++)
                v = v.Replace(instance.Data[i].Id, $"<dataElementId[{i}]>");
            return v;
        };

    internal static Func<string, string> InstanceStringScrubber(ReadApiResponse<Instance> readResponse) =>
        readResponse.Data.Model is not null ? InstanceStringScrubber(readResponse.Data.Model) : v => v;
}
