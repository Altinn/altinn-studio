#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Tests.Models;

public class MimeTypeTests
{
    [Fact]
    public void Equals_matches_string_to_type()
    {
        var mimeType = new MimeType("application/pdf");
        mimeType.Equals("application/pdf").Should().BeTrue();
    }

    [Fact]
    public void Equals_not_matches_string_to_type_no_aliases()
    {
        var mimeType = new MimeType("application/pdf");
        mimeType.Equals("application/zip").Should().BeFalse();
    }

    [Fact]
    public void Equals_matches_string_to_alias()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType.Equals("application/x-zip-compressed").Should().BeTrue();
    }

    [Fact]
    public void Equals_matches_stringvalues_to_type()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType.Equals(new StringValues("application/zip")).Should().BeTrue();
    }

    [Fact]
    public void Equals_matches_mimetype_when_type_and_alias_equal()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType.Equals(new MimeType("application/zip", "application/x-zip-compressed")).Should().BeTrue();
    }

    [Fact]
    public void Equals_not_matches_mimetype_when_type_not_equal()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType
            .Equals(new MimeType("application/x-zip-compressed", "application/x-zip-compressed"))
            .Should()
            .BeFalse();
    }

    [Fact]
    public void Equals_not_matches_mimetype_when_alias_not_equal()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType.Equals(new MimeType("application/zip")).Should().BeFalse();
    }

    [Fact]
    public void Equals_returns_false_when_object_is_null()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType.Equals(null).Should().BeFalse();
    }

    [Fact]
    public void Equals_returns_false_when_unknown_object()
    {
        var mimeType = new MimeType("application/zip", "application/x-zip-compressed");
        mimeType.Equals(1).Should().BeFalse();
    }
}
