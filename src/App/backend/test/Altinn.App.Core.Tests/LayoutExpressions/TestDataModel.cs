using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using FluentAssertions;
using Newtonsoft.Json;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestDataModel
{
    [Fact]
    public void TestSimpleGet()
    {
        var model = new Model { Name = new() { Value = "myValue" } };
        var modelHelper = new ReflectionFormDataWrapper(model);
        modelHelper.Get("does.not.exist").Should().BeNull();
        modelHelper.Get("name.value").Should().Be(model.Name.Value);
        modelHelper.Get(modelHelper.AddIndexToPath("name.value", [1, 2, 3])).Should().Be(model.Name.Value);
    }

    [Fact]
    public void AttributeNoAttributeCaseSensitive()
    {
        var model = new Model { NoAttribute = "asdfsf559" };
        var modelHelper = new ReflectionFormDataWrapper(model);
        modelHelper.Get("NOATTRIBUTE").Should().BeNull("data model lookup is case sensitive");
        modelHelper.Get("noAttribute").Should().BeNull();
        modelHelper.Get("NoAttribute").Should().Be("asdfsf559");
    }

    [Fact]
    public void NewtonsoftAttributeWorks()
    {
        var modelHelper = new ReflectionFormDataWrapper(new Model { OnlyNewtonsoft = "asdfsf559" });
        modelHelper.Get("OnlyNewtonsoft").Should().BeNull("Attribute should win over property when set");
        modelHelper.Get("ONlyNewtonsoft").Should().BeNull();
        modelHelper.Get("onlyNewtonsoft").Should().Be("asdfsf559");
    }

    [Fact]
    public void SystemTextJsonAttributeWorks()
    {
        var modelHelper = new ReflectionFormDataWrapper(new Model { OnlySystemTextJson = "asdfsf559" });
        modelHelper.Get("OnlySystemTextJson").Should().BeNull("Attribute should win over property when set");
        modelHelper.Get("onlysystemtextjson").Should().BeNull();
        modelHelper.Get("onlySystemTextJson").Should().Be("asdfsf559");
    }

    [Fact]
    public void RecursiveLookup()
    {
        var model = new Model
        {
            Friends = new List<Friend>
            {
                new()
                {
                    Name = new() { Value = "Donald Duck" },
                    Age = 123,
                },
                new() { Name = new() { Value = "Dolly Duck" } },
            },
        };
        var modelHelper = new ReflectionFormDataWrapper(model);
        modelHelper.Get("friends.name.value").Should().BeNull();
        modelHelper.Get("friends[0].name.value").Should().Be("Donald Duck");
        modelHelper.Get("friends.name.value", [0]).Should().Be("Donald Duck");
        modelHelper.Get("friends[0].age").Should().Be(123);
        modelHelper.Get("friends.age", [0]).Should().Be(123);
        modelHelper.Get("friends[1].name.value").Should().Be("Dolly Duck");
        modelHelper.Get("friends.name.value", [1]).Should().Be("Dolly Duck");

        // Run the same tests with JsonDataModel
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(model));
        var jsonModelHelper = new ReflectionFormDataWrapper(
            DynamicClassBuilder.DataObjectFromJsonDocument(doc.RootElement)
        );
        jsonModelHelper.Get("friends.name.value").Should().BeNull();
        jsonModelHelper.Get("friends[0].name.value").Should().Be("Donald Duck");
        jsonModelHelper.Get("friends.name.value", [0]).Should().Be("Donald Duck");
        jsonModelHelper.Get("friends[0].age").Should().Be(123);
        jsonModelHelper.Get("friends.age", [0]).Should().Be(123);
        jsonModelHelper.Get("friends[1].name.value").Should().Be("Dolly Duck");
        jsonModelHelper.Get("friends.name.value", [1]).Should().Be("Dolly Duck");
    }

    [Fact]
    public void DoubleRecursiveLookup()
    {
        var model = new Model
        {
            Friends = new List<Friend>
            {
                new()
                {
                    Name = new() { Value = "Donald Duck" },
                    Age = 123,
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new() { Value = "Onkel Skrue" },
                            Age = 2022,
                            Friends = new List<Friend>
                            {
                                new()
                                {
                                    Name = new() { Value = "LykkeTiøringen" },
                                    Age = 23,
                                },
                                new()
                                {
                                    Name = new() { Value = "Madam mim" },
                                    Age = 23,
                                },
                            },
                        },
                    },
                },
                new()
                {
                    Name = new() { Value = "Dolly Duck" },
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new() { Value = "Onkel Skrue" },
                            Age = 2022,
                            Friends = new List<Friend>()
                            {
                                new()
                                {
                                    Name = new() { Value = "LykkeTiøringen" },
                                    Age = 23,
                                },
                                new()
                                {
                                    Name = new() { Value = "Madam mim" },
                                    Age = 23,
                                },
                            },
                        },
                    },
                },
            },
        };

        var modelHelper = new ReflectionFormDataWrapper(model);
        modelHelper.Get("friends[1].friends[0].name.value").Should().Be("Onkel Skrue");
        modelHelper.Get("friends[1].friends.name.value", [0, 0]).Should().BeNull();
        modelHelper
            .Get("friends[1].friends.name.value", [1, 0])
            .Should()
            .BeNull("context indexes should not be used after literal index is used");
        modelHelper.Get("friends[1].friends.name.value", [1]).Should().BeNull();
        modelHelper.Get("friends.friends[0].name.value", [1, 4, 5, 7]).Should().Be("Onkel Skrue");
        modelHelper.GetRowCount("friends[1].friends", Array.Empty<int>()).Should().Be(1);
        modelHelper.GetRowCount("friends.friends", [1]).Should().Be(1);
        modelHelper.GetRowCount("friends[1].friends.friends", [1, 0, 0]).Should().BeNull();
        modelHelper.GetRowCount("friends[1].friends[0].friends", [1, 0, 0]).Should().Be(2);
        modelHelper.GetRowCount("friends.friends.friends", [1, 0]).Should().Be(2);
        modelHelper.GetRowCount("friends.friends", [1]).Should().Be(1);

        // Run the same tests with JsonDataModel
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(model));
        var jsonModelHelper = new ReflectionFormDataWrapper(
            DynamicClassBuilder.DataObjectFromJsonDocument(doc.RootElement)
        );
        jsonModelHelper.Get("friends[1].friends[0].name.value").Should().Be("Onkel Skrue");
        jsonModelHelper.Get("friends[1].friends.name.value", [0, 0]).Should().BeNull();
        jsonModelHelper
            .Get("friends[1].friends.name.value", [1, 0])
            .Should()
            .BeNull("context indexes should not be used after literal index is used");
        jsonModelHelper.Get("friends[1].friends.name.value", [1]).Should().BeNull();
        jsonModelHelper.Get("friends.friends[0].name.value", [1, 4, 5, 7]).Should().Be("Onkel Skrue");
        jsonModelHelper.GetRowCount("friends[1].friends", Array.Empty<int>()).Should().Be(1);
        jsonModelHelper.GetRowCount("friends.friends", [1]).Should().Be(1);
        jsonModelHelper.GetRowCount("friends[1].friends.friends", [1, 0, 0]).Should().BeNull();
        jsonModelHelper.GetRowCount("friends[1].friends[0].friends", [1, 0, 0]).Should().Be(2);
        jsonModelHelper.GetRowCount("friends.friends.friends", [1, 0]).Should().Be(2);
        jsonModelHelper.GetRowCount("friends.friends", [1]).Should().Be(1);
    }

    [Fact]
    public void TestRemoveFields()
    {
        var model = new Model()
        {
            Id = 2,
            Name = new() { Value = "Ivar" },
            Friends = new List<Friend>
            {
                new()
                {
                    Name = new() { Value = "Første venn" },
                    Age = 1235,
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new() { Value = "Første venn sin venn" },
                            Age = 233,
                        },
                    },
                },
            },
        };
        var modelHelper = new ReflectionFormDataWrapper(model);
        model.Id.Should().Be(2);
        modelHelper.RemoveField("id", RowRemovalOption.SetToNull);
        model.Id.Should().Be(default);

        model.Name.Value.Should().Be("Ivar");
        modelHelper.RemoveField("name", RowRemovalOption.SetToNull);
        model.Name.Should().BeNull();

        model.Friends.First().Name!.Value.Should().Be("Første venn");
        modelHelper.RemoveField("friends[0].name.value", RowRemovalOption.SetToNull);
        model.Friends.First().Name!.Value.Should().BeNull();
        modelHelper.RemoveField("friends[0].name", RowRemovalOption.SetToNull);
        model.Friends.First().Name.Should().BeNull();
        model.Friends.First().Age.Should().Be(1235);

        model.Friends.First().Friends!.First().Age.Should().Be(233);
        modelHelper.RemoveField("friends[0].friends", RowRemovalOption.SetToNull);
        model.Friends.First().Friends.Should().BeNull();
    }

    [Fact]
    public void TestRemoveRows()
    {
        var model = new Model()
        {
            Id = 2,
            Name = new() { Value = "Per" },
            Friends = new List<Friend>
            {
                new()
                {
                    Name = new() { Value = "Første venn" },
                    Age = 1235,
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new() { Value = "Første venn sin første venn" },
                            Age = 233,
                        },
                        new()
                        {
                            Name = new() { Value = "Første venn sin andre venn" },
                            Age = 233,
                        },
                        new()
                        {
                            Name = new() { Value = "Første venn sin tredje venn" },
                            Age = 233,
                        },
                    },
                },
                new()
                {
                    Name = new() { Value = "Andre venn" },
                    Age = 1235,
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new() { Value = "Andre venn sin venn" },
                            Age = 233,
                        },
                    },
                },
                new()
                {
                    Name = new() { Value = "Tredje venn" },
                    Age = 1235,
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new() { Value = "Tredje venn sin venn" },
                            Age = 233,
                        },
                    },
                },
            },
        };
        var serializedModel = JsonSerializer.Serialize(model);

        // deleteRows = false
        var model1 = JsonSerializer.Deserialize<Model>(serializedModel)!;
        var modelHelper1 = new ReflectionFormDataWrapper(model1);

        modelHelper1.RemoveField("friends[0].friends[0]", RowRemovalOption.SetToNull);
        model1.Friends![0].Friends![0].Should().BeNull();
        model1.Friends![0].Friends!.Count.Should().Be(3);
        model1.Friends[0].Friends![1].Name!.Value.Should().Be("Første venn sin andre venn");

        modelHelper1.RemoveField("friends[1]", RowRemovalOption.SetToNull);
        model1.Friends[1].Should().BeNull();
        model1.Friends.Count.Should().Be(3);
        model1.Friends[2].Name!.Value.Should().Be("Tredje venn");

        // deleteRows = true
        var model2 = JsonSerializer.Deserialize<Model>(serializedModel)!;
        var modelHelper2 = new ReflectionFormDataWrapper(model2);

        modelHelper2.RemoveField("friends[0].friends[0]", RowRemovalOption.DeleteRow);
        model2.Friends![0].Friends!.Count.Should().Be(2);
        model2.Friends[0].Friends![0].Name!.Value.Should().Be("Første venn sin andre venn");

        modelHelper2.RemoveField("friends[1]", RowRemovalOption.DeleteRow);
        model2.Friends.Count.Should().Be(2);
        model2.Friends[1].Name!.Value.Should().Be("Tredje venn");
    }

    [Fact]
    public void TestErrorCases()
    {
        var modelHelper = new ReflectionFormDataWrapper(
            new Model()
            {
                Id = 3,
                Friends = new List<Friend>() { new() { Name = new() { Value = "Ole" } } },
            }
        );
        Assert.Null(modelHelper.Get("."));
        modelHelper.Get("friends[0]").Should().BeOfType<Friend>().Which.Name?.Value.Should().Be("Ole");
        modelHelper.Get("friends[3]").Should().BeNull();

        Assert.Null(modelHelper.AddIndexToPath("tull.sd", [2]));

        modelHelper
            .Invoking(m => m.AddIndexToPath("id[4]", [6]))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Index on non indexable property");
    }

    [Fact]
    public void TestAddIndexes()
    {
        var modelHelper = new ReflectionFormDataWrapper(
            new Model
            {
                Id = 3,
                Friends = new List<Friend>() { new() { Name = new() { Value = "Ole" } } },
            }
        );

        // Plain add indexes
        modelHelper.AddIndexToPath("friends.friends.name", [0, 1]).Should().Be("friends[0].friends[1].name");

        // Ignore extra indexes
        modelHelper.AddIndexToPath("friends.friends", [0, 1, 4, 6]).Should().Be("friends[0].friends[1]");

        // Add empty when too few indexes
        Assert.Null(modelHelper.AddIndexToPath("friends.friends.friends", [0]));

        // Don't add indexes if they are specified in input
        modelHelper.AddIndexToPath("friends[3]", [0]).Should().Be("friends[3]");

        // First index (and remaining) is ignored if first is explicit
        Assert.Null(modelHelper.AddIndexToPath("friends[0].friends.friends", [2, 3]));

        // After we have used one index from context, we still respect explicit indexes
        modelHelper.AddIndexToPath("friends.friends[4].name", [10, 10]).Should().Be("friends[10].friends[4].name");
    }

    [Fact]
    public void AddIndexes_WhenGivenIndexOnNonIndexableProperty_ThrowsError()
    {
        var modelHelper = new ReflectionFormDataWrapper(new Model { Id = 3 });

        // Throws because id is not indexable
        modelHelper
            .Invoking(m => m.AddIndexToPath("id[0]", [1, 2, 3]))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Index on non indexable property");
    }

    [Fact]
    public void RemoveField_WhenValueDoesNotExist_DoNothing()
    {
        var modelHelper = new ReflectionFormDataWrapper(new Model());

        // real fields works, no error
        modelHelper.RemoveField("id", RowRemovalOption.SetToNull);

        // non-existent-fields works, no error
        modelHelper.RemoveField("doesNotExist", RowRemovalOption.SetToNull);

        // non-existent-fields in subfield works, no error
        modelHelper.RemoveField("friends.doesNotExist", RowRemovalOption.SetToNull);

        // non-existent-fields in subfield works, no error
        modelHelper.RemoveField("friends[0].doesNotExist", RowRemovalOption.SetToNull);
    }
}

public class Model
{
    [JsonProperty("id")]
    [JsonPropertyName("id")]
    public int Id { get; set; } = 123;

    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public Name? Name { get; set; }

    public string? NoAttribute { get; set; }

    [JsonProperty("onlyNewtonsoft")]
    public string? OnlyNewtonsoft { get; set; }

    [JsonPropertyName("onlySystemTextJson")]
    public string? OnlySystemTextJson { get; set; }

    [JsonProperty("newtonsoftWrongName")]
    public string? DifferentName { get; set; }

    [JsonProperty("friends")]
    [JsonPropertyName("friends")]
    public IList<Friend>? Friends { get; set; }
}

public class Name
{
    [JsonProperty("value")]
    [JsonPropertyName("value")]
    public string? Value { get; set; }
}

public class Friend
{
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public Name? Name { get; set; }

    [JsonProperty("age")]
    [JsonPropertyName("age")]
    public decimal? Age { get; set; }

    // Infinite recursion. Simple way for testing
    [JsonProperty("friends")]
    [JsonPropertyName("friends")]
    public IList<Friend>? Friends { get; set; }
}
