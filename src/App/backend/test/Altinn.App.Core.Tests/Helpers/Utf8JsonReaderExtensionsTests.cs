#nullable disable
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Altinn.App.Core.Helpers.Extensions;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class Utf8JsonReaderExtensionsTests
{
    [Fact]
    public void TestArray()
    {
        var value = @"{ ""arr"": [ {} ], ""number"": 123, ""true"": true, ""false"": false, ""null"": null }";

        var reader = new Utf8JsonReader(Encoding.UTF8.GetBytes(value));

        reader.Read();
        var result = Utf8JsonReaderExtensions.SkipReturnString(ref reader);
        var regex = new Regex(Environment.NewLine + @"\s*"); // remove newlines and indentation for comparison to work
        result = regex.Replace(result, " ");
        result.Should().Be(value);
    }

    [Fact]
    public void TestComment()
    {
        var nl = Environment.NewLine;
        var value =
            @"{"
            + nl
            + @"  ""component"": ""testComp"""
            + nl
            + @"  /* this is a comment */,"
            + nl
            + @"  ""data"": ["
            + nl
            + @"    /* a comment too */"
            + nl
            + @"    23"
            + nl
            + @"    /* a comment too */"
            + nl
            + @"  ]"
            + nl
            + @"}";

        var reader = new Utf8JsonReader(
            Encoding.UTF8.GetBytes(value),
            new JsonReaderOptions { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Allow }
        );

        reader.Read();

        // This test might fail based on formatting of the json value.
        var result = Utf8JsonReaderExtensions.SkipReturnString(ref reader);
        result.Should().Be(value);
    }
}
