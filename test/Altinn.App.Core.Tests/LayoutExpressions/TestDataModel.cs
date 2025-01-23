using System.Collections;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Newtonsoft.Json;
using JsonSerializer = System.Text.Json.JsonSerializer;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestDataModel
{
    private readonly DataElement _dataElement = new() { DataType = "default" };

    [Fact]
    public void TestSimpleGet()
    {
        var model = new Model { Name = new() { Value = "myValue" } };
        var modelHelper = new DataModelWrapper(model);
        modelHelper.GetModelData("does.not.exist").Should().BeNull();
        modelHelper.GetModelData("name.value").Should().Be(model.Name.Value);
        modelHelper.GetModelData("name.value", [1, 2, 3]).Should().Be(model.Name.Value);
    }

    [Fact]
    public void AttributeNoAttriubteCaseSensitive()
    {
        var model = new Model { NoAttribute = "asdfsf559" };
        var modelHelper = new DataModelWrapper(model);
        modelHelper.GetModelData("NOATTRIBUTE").Should().BeNull("data model lookup is case sensitive");
        modelHelper.GetModelData("noAttribute").Should().BeNull();
        modelHelper.GetModelData("NoAttribute").Should().Be("asdfsf559");
    }

    [Fact]
    public void NewtonsoftAttributeWorks()
    {
        var modelHelper = new DataModelWrapper(new Model { OnlyNewtonsoft = "asdfsf559" });
        modelHelper.GetModelData("OnlyNewtonsoft").Should().BeNull("Attribute should win over property when set");
        modelHelper.GetModelData("ONlyNewtonsoft").Should().BeNull();
        modelHelper.GetModelData("onlyNewtonsoft").Should().Be("asdfsf559");
    }

    [Fact]
    public void SystemTextJsonAttributeWorks()
    {
        var modelHelper = new DataModelWrapper(new Model { OnlySystemTextJson = "asdfsf559" });
        modelHelper.GetModelData("OnlySystemTextJson").Should().BeNull("Attribute should win over property when set");
        modelHelper.GetModelData("onlysystemtextjson").Should().BeNull();
        modelHelper.GetModelData("onlySystemTextJson").Should().Be("asdfsf559");
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
        var modelHelper = new DataModelWrapper(model);
        modelHelper.GetModelData("friends.name.value").Should().BeNull();
        modelHelper.GetModelData("friends[0].name.value").Should().Be("Donald Duck");
        modelHelper.GetModelData("friends.name.value", [0]).Should().Be("Donald Duck");
        modelHelper.GetModelData("friends[0].age").Should().Be(123);
        modelHelper.GetModelData("friends.age", [0]).Should().Be(123);
        modelHelper.GetModelData("friends[1].name.value").Should().Be("Dolly Duck");
        modelHelper.GetModelData("friends.name.value", [1]).Should().Be("Dolly Duck");

        // Run the same tests with JsonDataModel
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(model));
        var jsonModelHelper = new DataModelWrapper(DynamicClassBuilder.DataObjectFromJsonDocument(doc.RootElement));
        jsonModelHelper.GetModelData("friends.name.value").Should().BeNull();
        jsonModelHelper.GetModelData("friends[0].name.value").Should().Be("Donald Duck");
        jsonModelHelper.GetModelData("friends.name.value", [0]).Should().Be("Donald Duck");
        jsonModelHelper.GetModelData("friends[0].age").Should().Be(123);
        jsonModelHelper.GetModelData("friends.age", [0]).Should().Be(123);
        jsonModelHelper.GetModelData("friends[1].name.value").Should().Be("Dolly Duck");
        jsonModelHelper.GetModelData("friends.name.value", [1]).Should().Be("Dolly Duck");
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

        var modelHelper = new DataModelWrapper(model);
        modelHelper.GetModelData("friends[1].friends[0].name.value").Should().Be("Onkel Skrue");
        modelHelper.GetModelData("friends[1].friends.name.value", [0, 0]).Should().BeNull();
        modelHelper
            .GetModelData("friends[1].friends.name.value", [1, 0])
            .Should()
            .BeNull("context indexes should not be used after literal index is used");
        modelHelper.GetModelData("friends[1].friends.name.value", [1]).Should().BeNull();
        modelHelper.GetModelData("friends.friends[0].name.value", [1, 4, 5, 7]).Should().Be("Onkel Skrue");
        modelHelper.GetModelDataCount("friends[1].friends", Array.Empty<int>()).Should().Be(1);
        modelHelper.GetModelDataCount("friends.friends", [1]).Should().Be(1);
        modelHelper.GetModelDataCount("friends[1].friends.friends", [1, 0, 0]).Should().BeNull();
        modelHelper.GetModelDataCount("friends[1].friends[0].friends", [1, 0, 0]).Should().Be(2);
        modelHelper.GetModelDataCount("friends.friends.friends", [1, 0, 0]).Should().Be(2);
        modelHelper.GetModelDataCount("friends.friends", [1]).Should().Be(1);

        // Run the same tests with JsonDataModel
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(model));
        var jsonModelHelper = new DataModelWrapper(DynamicClassBuilder.DataObjectFromJsonDocument(doc.RootElement));
        jsonModelHelper.GetModelData("friends[1].friends[0].name.value").Should().Be("Onkel Skrue");
        jsonModelHelper.GetModelData("friends[1].friends.name.value", [0, 0]).Should().BeNull();
        jsonModelHelper
            .GetModelData("friends[1].friends.name.value", [1, 0])
            .Should()
            .BeNull("context indexes should not be used after literal index is used");
        jsonModelHelper.GetModelData("friends[1].friends.name.value", [1]).Should().BeNull();
        jsonModelHelper.GetModelData("friends.friends[0].name.value", [1, 4, 5, 7]).Should().Be("Onkel Skrue");
        jsonModelHelper.GetModelDataCount("friends[1].friends", Array.Empty<int>()).Should().Be(1);
        jsonModelHelper.GetModelDataCount("friends.friends", [1]).Should().Be(1);
        jsonModelHelper.GetModelDataCount("friends[1].friends.friends", [1, 0, 0]).Should().BeNull();
        jsonModelHelper.GetModelDataCount("friends[1].friends[0].friends", [1, 0, 0]).Should().Be(2);
        jsonModelHelper.GetModelDataCount("friends.friends.friends", [1, 0, 0]).Should().Be(2);
        jsonModelHelper.GetModelDataCount("friends.friends", [1]).Should().Be(1);
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
        var modelHelper = new DataModelWrapper(model);
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
        var modelHelper1 = new DataModelWrapper(model1);

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
        var modelHelper2 = new DataModelWrapper(model2);

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
        var modelHelper = new DataModelWrapper(
            new Model()
            {
                Id = 3,
                Friends = new List<Friend>() { new() { Name = new() { Value = "Ole" } } },
            }
        );
        modelHelper.Invoking(m => m.GetModelData(".")).Should().Throw<DataModelException>().WithMessage("*empty part*");
        modelHelper.GetModelData("friends[0]").Should().BeOfType<Friend>().Which.Name?.Value.Should().Be("Ole");
        modelHelper.GetModelData("friends[3]").Should().BeNull();

        modelHelper
            .Invoking(m => m.AddIndicies("tull.sd", [2]))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Unknown model property tull in*");

        modelHelper
            .Invoking(m => m.AddIndicies("id[4]", [6]))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Index on non indexable property");
    }

    [Fact]
    public void TestEdgeCaseWithNonGenericEnumerableForCoverage()
    {
        // Test with erroneous model with non-generic IEnumerable (special error for code coverage)
        var modelHelper = new DataModelWrapper(
            new
            {
                // ArrayList is not supported as a data model
                friends = new ArrayList { 1, 2, 3 },
            }
        );
        modelHelper
            .Invoking(m => m.AddIndicies("friends", [0]))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("DataModels must have generic IEnumerable<> implementation for list");
    }

    [Fact]
    public void TestAddIndicies()
    {
        var modelHelper = new DataModelWrapper(
            new Model
            {
                Id = 3,
                Friends = new List<Friend>() { new() { Name = new() { Value = "Ole" } } },
            }
        );

        // Plain add indicies
        modelHelper.AddIndicies("friends.friends", [0, 1]).Should().Be("friends[0].friends[1]");

        // Ignore extra indicies
        modelHelper.AddIndicies("friends.friends", [0, 1, 4, 6]).Should().Be("friends[0].friends[1]");

        // Don't add indicies if they are specified in input
        modelHelper.AddIndicies("friends[3]", [0]).Should().Be("friends[3]");

        // First index is ignored if it is explicit
        modelHelper.AddIndicies("friends[0].friends", [2, 3]).Should().Be("friends[0].friends[3]");
    }

    [Fact]
    public void AddIndicies_WhenGivenIndexOnNonIndexableProperty_ThrowsError()
    {
        var modelHelper = new DataModelWrapper(new Model { Id = 3 });

        // Throws because id is not indexable
        modelHelper
            .Invoking(m => m.AddIndicies("id[0]", [1, 2, 3]))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Index on non indexable property");
    }

    [Fact]
    public void RemoveField_WhenValueDoesNotExist_DoNothing()
    {
        var modelHelper = new DataModelWrapper(new Model());

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
