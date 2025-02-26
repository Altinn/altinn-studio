﻿using Altinn.Studio.DataModeling.Json.Keywords;
using DataModeling.Tests.Json.Keywords.BaseClasses;
using Xunit;

namespace DataModeling.Tests.Json.Keywords.FormatRange.Keyword;

public class FormatMinimumKeywordTests : ValueKeywordTestsBase<FormatMinimumKeywordTests, FormatMinimumKeyword, string>
{
    protected override FormatMinimumKeyword CreateKeywordWithValue(string value) => new(value);

    [Theory]
    [InlineData("2022-10-18")]
    public void CreatedKeyword_ShouldHaveValue(string value)
    {
        Keyword = new FormatMinimumKeyword(value);
        Assert.Equal(value, Keyword.Value);
    }

    [Theory]
    [InlineData("2022-10-18")]
    public void SameKeywords_Should_BeEqual(string value)
    {
        var expectedKeyword = new FormatMinimumKeyword(value);
        object expectedKeywordObject = new FormatMinimumKeyword(value);

        Given.That.KeywordCreatedWithValue(value)
            .Then.KeywordShouldEqual(expectedKeyword)
            .And.KeywordShouldEqualObject(expectedKeywordObject)
            .But.KeywordShouldNotEqual(null);
    }

    [Theory]
    [InlineData("2022-10-18")]
    public void GetHashCode_ShouldBe_As_Value(string value)
    {
        var expectedHashCode = value.GetHashCode();
        Given.That.KeywordCreatedWithValue(value);
        Assert.Equal(expectedHashCode, Keyword.GetHashCode());
    }
}
