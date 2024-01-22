#nullable enable
using Altinn.App.Core.Helpers;
using FluentAssertions;
using Xunit;

namespace Altinn.App.Core.Tests.Helpers;

public class ObjectUtilsTests
{
    public class TestClass
    {
        public string? StringValue { get; set; }

        public decimal Decimal { get; set; }

        public decimal? NullableDecimal { get; set; }

        public TestClass? Child { get; set; }

        public List<TestClass>? Children { get; set; }
    }

    [Fact]
    public void TestSimple()
    {
        var test = new TestClass();
        test.Children.Should().BeNull();

        ObjectUtils.InitializeListsAndNullEmptyStrings(test);

        test.Children.Should().BeEmpty();
    }

    [Fact]
    public void TestSimpleStringInitialized()
    {
        var test = new TestClass()
        {
            StringValue = "some",
        };
        test.Children.Should().BeNull();

        ObjectUtils.InitializeListsAndNullEmptyStrings(test);

        test.Children.Should().BeEmpty();
        test.StringValue.Should().Be("some");
    }

    [Fact]
    public void TestSimpleListInitialized()
    {
        var test = new TestClass()
        {
            Children = new(),
        };
        test.Children.Should().BeEmpty();

        ObjectUtils.InitializeListsAndNullEmptyStrings(test);

        test.Children.Should().BeEmpty();
    }

    [Fact]
    public void TestMultipleLevelsInitialized()
    {
        var test = new TestClass()
        {
            Child = new TestClass()
            {
                Child = new TestClass()
                {
                    Child = new TestClass()
                    {
                        Children = new()
                        {
                            new TestClass()
                            {
                                Child = new TestClass()
                            }
                        }
                    }
                }
            }
        };
        test.Children.Should().BeNull();
        test.Child.Children.Should().BeNull();
        test.Child.Child.Children.Should().BeNull();
        var subChild = test.Child.Child.Child.Children.Should().ContainSingle().Which;
        subChild.Children.Should().BeNull();
        subChild.Child.Should().NotBeNull();
        subChild.Child!.Children.Should().BeNull();

        // Act
        ObjectUtils.InitializeListsAndNullEmptyStrings(test);

        // Assert
        test.Children.Should().BeEmpty();
        test.Child.Children.Should().BeEmpty();
        test.Child.Child.Children.Should().BeEmpty();
        subChild = test.Child.Child.Child.Children.Should().ContainSingle().Which;
        subChild.Children.Should().BeEmpty();
        subChild.Child.Should().NotBeNull();
        subChild.Child!.Children.Should().BeEmpty();
    }
}