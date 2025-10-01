using Altinn.App.Core.Helpers;
using FluentAssertions;

namespace Altinn.App.Core.Tests.Helpers;

public class ObjectUtilsTests
{
    public class TestClass
    {
        public Guid AltinnRowId { get; set; }

        public string? StringValue { get; set; }

        public decimal Decimal { get; set; }

        public decimal? NullableDecimal { get; set; }

        public DateTime? DateTime { get; set; }

        public TestClass? Child { get; set; }

        public List<TestClass>? Children { get; set; }
    }

    [Fact]
    public void TestSimple()
    {
        var test = new TestClass();
        test.Children.Should().BeNull();

        ObjectUtils.InitializeAltinnRowId(test);
        ObjectUtils.PrepareModelForXmlStorage(test);

        test.Children.Should().BeEmpty();
    }

    [Fact]
    public void TestSimpleStringInitialized()
    {
        var test = new TestClass() { StringValue = "some" };
        test.Children.Should().BeNull();

        ObjectUtils.InitializeAltinnRowId(test);
        ObjectUtils.PrepareModelForXmlStorage(test);

        test.Children.Should().BeEmpty();
        test.StringValue.Should().Be("some");
    }

    [Fact]
    public void TestSimpleListInitialized()
    {
        var test = new TestClass() { Children = new() };
        test.Children.Should().BeEmpty();

        ObjectUtils.InitializeAltinnRowId(test);

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
                    Child = new TestClass() { Children = new() { new TestClass() { Child = new TestClass() } } },
                },
            },
        };
        test.Children.Should().BeNull();
        test.Child.Children.Should().BeNull();
        test.Child.Child.Children.Should().BeNull();
        var subChild = test.Child.Child.Child.Children.Should().ContainSingle().Which;
        subChild.Children.Should().BeNull();
        subChild.Child.Should().NotBeNull();
        subChild.Child!.Children.Should().BeNull();

        // Act
        ObjectUtils.InitializeAltinnRowId(test);
        ObjectUtils.PrepareModelForXmlStorage(test);

        // Assert
        test.Children.Should().BeEmpty();
        test.Child.Children.Should().BeEmpty();
        test.Child.Child.Children.Should().BeEmpty();
        subChild = test.Child.Child.Child.Children.Should().ContainSingle().Which;
        subChild.Children.Should().BeEmpty();
        subChild.Child.Should().NotBeNull();
        subChild.Child!.Children.Should().BeEmpty();
    }

    [Fact]
    public void TestGuidInitialized()
    {
        var dateTime = DateTime.Parse("2021-01-01");
        var test = new TestClass()
        {
            Child = new(),
            Children = new List<TestClass>() { new TestClass(), new TestClass() },
            DateTime = dateTime,
            NullableDecimal = 1.1m,
            Decimal = 2.2m,
        };
        test.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Children.Should().AllSatisfy(c => c.AltinnRowId.Should().Be(Guid.Empty));

        ObjectUtils.InitializeAltinnRowId(test);

        test.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Children.Should().AllSatisfy(c => c.AltinnRowId.Should().NotBe(Guid.Empty));
        test.DateTime.Should().Be(dateTime);
        test.NullableDecimal.Should().Be(1.1m);
        test.Decimal.Should().Be(2.2m);

        ObjectUtils.RemoveAltinnRowId(test);

        test.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Children.Should().AllSatisfy(c => c.AltinnRowId.Should().Be(Guid.Empty));
    }

    [Fact]
    public void TestRemoveAltinnRowId()
    {
        var test = new TestClass()
        {
            AltinnRowId = Guid.NewGuid(),
            Child = new()
            {
                AltinnRowId = Guid.NewGuid(),
                Child = new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Children = new()
                    {
                        new TestClass()
                        {
                            AltinnRowId = Guid.NewGuid(),
                            Child = new() { AltinnRowId = Guid.NewGuid() },
                        },
                    },
                },
            },
        };
        test.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.Children.Should().ContainSingle().Which.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.Children.Should().ContainSingle().Which.Child!.AltinnRowId.Should().NotBe(Guid.Empty);

        ObjectUtils.RemoveAltinnRowId(test);

        test.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.Child.Children.Should().ContainSingle().Which.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.Child.Children.Should().ContainSingle().Which.Child!.AltinnRowId.Should().Be(Guid.Empty);

        ObjectUtils.InitializeAltinnRowId(test);

        test.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.Children.Should().ContainSingle().Which.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.Children.Should().ContainSingle().Which.Child!.AltinnRowId.Should().NotBe(Guid.Empty);
    }

    [Fact]
    public void TestRemoveAltinnRowIdWithNulls()
    {
        var test = new TestClass()
        {
            AltinnRowId = Guid.NewGuid(),
            Child = new()
            {
                AltinnRowId = Guid.NewGuid(),
                Child = new()
                {
                    AltinnRowId = Guid.NewGuid(),
                    Children = new()
                    {
                        new TestClass()
                        {
                            AltinnRowId = Guid.NewGuid(),
                            Child = new() { AltinnRowId = Guid.NewGuid() },
                        },
                        null!,
                    },
                },
            },
        };
        test.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        var childArray = test.Child.Child.Children.Should().HaveCount(2).And;
        childArray.ContainSingle(d => d != null).Which.AltinnRowId.Should().NotBe(Guid.Empty);
        childArray.ContainSingle(d => d == null);

        ObjectUtils.RemoveAltinnRowId(test);

        test.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().Be(Guid.Empty);
        childArray = test.Child.Child.Children.Should().HaveCount(2).And;
        childArray.ContainSingle(d => d != null).Which.AltinnRowId.Should().Be(Guid.Empty);
        childArray.ContainSingle(d => d == null);

        ObjectUtils.InitializeAltinnRowId(test);

        test.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        childArray = test.Child.Child.Children.Should().HaveCount(2).And;
        childArray.ContainSingle(d => d != null).Which.AltinnRowId.Should().NotBe(Guid.Empty);
        childArray.ContainSingle(d => d == null);
    }

    [Fact]
    public void TestInitializeRowIdWithNulls()
    {
        var test = new TestClass()
        {
            AltinnRowId = Guid.Empty,
            Child = new()
            {
                AltinnRowId = Guid.Empty,
                Child = new()
                {
                    AltinnRowId = Guid.Empty,
                    Children = new()
                    {
                        new TestClass()
                        {
                            AltinnRowId = Guid.Empty,
                            Child = new() { AltinnRowId = Guid.Empty },
                        },
                        null!,
                    },
                },
            },
        };
        test.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().Be(Guid.Empty);
        var childArray = test.Child.Child.Children.Should().HaveCount(2).And;
        childArray.ContainSingle(d => d != null).Which.AltinnRowId.Should().Be(Guid.Empty);
        childArray.ContainSingle(d => d == null);

        ObjectUtils.InitializeAltinnRowId(test);

        test.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().NotBe(Guid.Empty);
        childArray = test.Child.Child.Children.Should().HaveCount(2).And;
        childArray.ContainSingle(d => d != null).Which.AltinnRowId.Should().NotBe(Guid.Empty);
        childArray.ContainSingle(d => d == null);

        ObjectUtils.RemoveAltinnRowId(test);

        test.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.AltinnRowId.Should().Be(Guid.Empty);
        test.Child.Child.AltinnRowId.Should().Be(Guid.Empty);
        childArray = test.Child.Child.Children.Should().HaveCount(2).And;
        childArray.ContainSingle(d => d != null).Which.AltinnRowId.Should().Be(Guid.Empty);
        childArray.ContainSingle(d => d == null);
    }
}
