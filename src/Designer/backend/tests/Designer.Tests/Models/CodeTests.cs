#nullable enable
using System.Collections.Generic;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Models;

public class CodeTests
{
    private readonly object _valueA = "value-a";
    private readonly object _valueB = "value-b";

    private readonly Dictionary<string, string> _labelEnOnly = new() { ["en"] = "Label A" };
    private readonly Dictionary<string, string> _labelNbOnly = new() { ["nb"] = "Etikett A" };
    private readonly Dictionary<string, string> _labelMixedDifferent = new() { ["en"] = "Label B", ["nb"] = "Etikett B" };

    private readonly Dictionary<string, string> _helpA = new() { ["en"] = "Help A" };
    private readonly Dictionary<string, string> _helpB = new() { ["en"] = "Help B" };

    private readonly Dictionary<string, string> _descriptionA = new() { ["en"] = "Desc A" };
    private readonly Dictionary<string, string> _descriptionB = new() { ["en"] = "Desc B" };

    private readonly List<string> _tagsAbc = ["a", "b", "c"];
    private readonly List<string> _tagsAcb = ["a", "c", "b"];
    private readonly List<string> _tagsAb = ["a", "b"];

    private static Code MakeCode(
        object value,
        Dictionary<string, string> label,
        Dictionary<string, string>? description,
        Dictionary<string, string>? helpText,
        List<string>? tags
    )
    {
        return new Code(value, label, description, helpText, tags);
    }

    private Code MakeCustomCode(
        object? value = null,
        Dictionary<string, string>? label = null,
        Dictionary<string, string>? description = null,
        Dictionary<string, string>? helpText = null,
        List<string>? tags = null
    )
    {
        return MakeCode(
            value: value ?? _valueA,
            label: label ?? _labelEnOnly,
            description: description,
            helpText: helpText,
            tags: tags);
    }

    [Fact]
    public void Equals_WhenOtherIsNull_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code? right = null;

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenOtherIsDifferentType_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        object right = new { value = _valueA };

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenValuesDiffer_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code right = MakeCustomCode(value: _valueB);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenLabelsDiffer_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code right = MakeCustomCode(label: _labelMixedDifferent);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenLabelLanguagesDiffer_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code right = MakeCustomCode(label: _labelNbOnly);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenDescriptionIsNullOnOneSide_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code right = MakeCustomCode(description: _descriptionA);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenDescriptionDiffers_ReturnsFalse()
    {
        Code left = MakeCustomCode(description: _descriptionA);
        Code right = MakeCustomCode(description: _descriptionB);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenHelpTextIsNullOnOneSide_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code right = MakeCustomCode(helpText: _helpA);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenHelpTextDiffers_ReturnsFalse()
    {
        Code left = MakeCustomCode(helpText: _helpB);
        Code right = MakeCustomCode(helpText: _helpA);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenOneTagsNull_ReturnsFalse()
    {
        Code left = MakeCustomCode();
        Code right = MakeCustomCode(tags: _tagsAb);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenTagsHaveDifferentOrder_ReturnsFalse()
    {
        Code left = MakeCustomCode(tags: _tagsAbc);
        Code right = MakeCustomCode(tags: _tagsAcb);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenTagsHaveDifferentLengths_ReturnsFalse()
    {
        Code left = MakeCustomCode(tags: _tagsAb);
        Code right = MakeCustomCode(tags: _tagsAbc);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Equals_WhenBothAreNull_ReturnsTrue()
    {
        Code? code1 = null;
        Code? code2 = null;

        bool result = Equals(code1, code2);

        Assert.True(result);
    }

    [Fact]
    public void EqualsMethod_WhenFirstIsNullAndSecondIsNull_ReturnsNull()
    {
        Code? code1 = null;
        Code? code2 = null;

        bool? result = code1?.Equals(code2);

        Assert.Null(result);
    }

    [Fact]
    public void ReferenceEquals_WhenBothAreNull_ReturnsTrue()
    {
        Code? code1 = null;
        Code? code2 = null;

        bool result = ReferenceEquals(code1, code2);

        Assert.True(result);
    }
}
