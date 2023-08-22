using Altinn.App.Core.Extensions;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Altinn.App.Core.Tests.Extensions
{
    public class DictionaryExtensionsTests
    {
        [Fact]
        public void ToNameValueString_OptionParameters_ShouldConvertToHttpHeaderFormat()
        {
            var options = new AppOptions
            {
                Parameters = new Dictionary<string, string>
                {
                    { "lang", "nb" },
                    { "level", "1" }
                },
            };

            IHeaderDictionary headers = new HeaderDictionary
            {
                { "Altinn-DownstreamParameters", options.Parameters.ToNameValueString(',') }
            };

            Assert.Equal("lang=nb,level=1", headers["Altinn-DownstreamParameters"]);
        }

        [Fact]
        public void ToNameValueString_OptionParametersWithEmptyValue_ShouldConvertToHttpHeaderFormat()
        {
            var options = new AppOptions
            {
                Parameters = new Dictionary<string, string>()
            };

            IHeaderDictionary headers = new HeaderDictionary
            {
                { "Altinn-DownstreamParameters", options.Parameters.ToNameValueString(',') }
            };

            Assert.Equal(string.Empty, headers["Altinn-DownstreamParameters"]);
        }

        [Fact]
        public void ToNameValueString_OptionParametersWithNullValue_ShouldConvertToHttpHeaderFormat()
        {
            var options = new AppOptions
            {
                Parameters = null
            };

            IHeaderDictionary headers = new HeaderDictionary
            {
                { "Altinn-DownstreamParameters", options.Parameters.ToNameValueString(',') }
            };

            Assert.Equal(string.Empty, headers["Altinn-DownstreamParameters"]);
        }
    }
}
