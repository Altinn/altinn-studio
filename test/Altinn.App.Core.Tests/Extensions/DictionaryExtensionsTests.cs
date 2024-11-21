using Altinn.App.Core.Extensions;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Tests.Extensions;

public class DictionaryExtensionsTests
{
    [Fact]
    public void ToNameValueString_OptionParameters_ShouldConvertToHttpHeaderFormat()
    {
        var options = new AppOptions
        {
            Parameters = new Dictionary<string, string?> { { "lang", "nb" }, { "level", "1" } },
        };

        IHeaderDictionary headers = new HeaderDictionary
        {
            { "Altinn-DownstreamParameters", options.Parameters.ToUrlEncodedNameValueString(',') },
        };

        Assert.Equal("lang=nb,level=1", headers["Altinn-DownstreamParameters"]);
    }

    [Fact]
    public void ToNameValueString_OptionParametersWithEmptyValue_ShouldConvertToHttpHeaderFormat()
    {
        var options = new AppOptions { Parameters = new Dictionary<string, string?>() };

        IHeaderDictionary headers = new HeaderDictionary
        {
            { "Altinn-DownstreamParameters", options.Parameters.ToUrlEncodedNameValueString(',') },
        };

        Assert.Equal(string.Empty, headers["Altinn-DownstreamParameters"]);
    }

    [Fact]
    public void ToNameValueString_OptionParametersWithNullValue_ShouldConvertToHttpHeaderFormat()
    {
        var options = new AppOptions { Parameters = null! };

        IHeaderDictionary headers = new HeaderDictionary
        {
            { "Altinn-DownstreamParameters", options.Parameters.ToUrlEncodedNameValueString(',') },
        };

        Assert.Equal(string.Empty, headers["Altinn-DownstreamParameters"]);
    }

    [Fact]
    public void ToNameValueString_OptionParametersWithSpecialCharaters_IsValidAsHeaders()
    {
        var options = new AppOptions
        {
            Parameters = new Dictionary<string, string?>
            {
                { "lang", "nb" },
                { "level", "1" },
                { "name", "ÆØÅ" },
                { "variant", "Småvilt1" },
            },
        };

        IHeaderDictionary headers = new HeaderDictionary();
        headers.Append("Altinn-DownstreamParameters", options.Parameters.ToUrlEncodedNameValueString(','));

        Assert.Equal(
            "lang=nb,level=1,name=%C3%86%C3%98%C3%85,variant=Sm%C3%A5vilt1",
            headers["Altinn-DownstreamParameters"]
        );
    }
}
