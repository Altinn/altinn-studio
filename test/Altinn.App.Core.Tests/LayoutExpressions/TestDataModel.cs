#nullable enable
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Tests.Helpers;
using FluentAssertions;

using Newtonsoft.Json;
using Xunit;

namespace Altinn.App.Core.Tests.LayoutExpressions.CSharpTests;

public class TestDataModel
{
    [Fact]
    public void TestSimpleGet()
    {
        var model = new Model
        {
            Name = new() { Value = "myValue" }
        };
        var modelHelper = new DataModel(model);
        modelHelper.GetModelData("does.not.exist", default).Should().BeNull();
        modelHelper.GetModelData("name.value", default).Should().Be(model.Name.Value);
        modelHelper.GetModelData("name.value", new int[] { 1, 2, 3 }).Should().Be(model.Name.Value);
    }

    [Fact]
    public void AttributeNoAttriubteCaseSensitive()
    {
        var modelHelper = new DataModel(new Model
        {
            NoAttribute = "asdfsf559",
        });
        modelHelper.GetModelData("NOATTRIBUTE", default).Should().BeNull("data model lookup is case sensitive");
        modelHelper.GetModelData("noAttribute", default).Should().BeNull();
        modelHelper.GetModelData("NoAttribute", default).Should().Be("asdfsf559");
    }

    [Fact]
    public void NewtonsoftAttributeWorks()
    {
        var modelHelper = new DataModel(new Model
        {
            OnlyNewtonsoft = "asdfsf559",
        });
        modelHelper.GetModelData("OnlyNewtonsoft", default).Should().BeNull("Attribute should win over property when set");
        modelHelper.GetModelData("ONlyNewtonsoft", default).Should().BeNull();
        modelHelper.GetModelData("onlyNewtonsoft", default).Should().Be("asdfsf559");
    }

    [Fact]
    public void SystemTextJsonAttributeWorks()
    {
        var modelHelper = new DataModel(new Model
        {
            OnlySystemTextJson = "asdfsf559",
        });
        modelHelper.GetModelData("OnlySystemTextJson", default).Should().BeNull("Attribute should win over property when set");
        modelHelper.GetModelData("onlysystemtextjson", default).Should().BeNull();
        modelHelper.GetModelData("onlySystemTextJson", default).Should().Be("asdfsf559");
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
                    Name = new()
                    {
                        Value = "Donald Duck"
                    },
                    Age = 123,
                },
                new()
                {
                    Name = new()
                    {
                        Value = "Dolly Duck"
                    }
                }
            }
        };
        IDataModelAccessor modelHelper = new DataModel(model);
        modelHelper.GetModelData("friends.name.value", default).Should().BeNull();
        modelHelper.GetModelData("friends[0].name.value", default).Should().Be("Donald Duck");
        modelHelper.GetModelData("friends.name.value", new int[] { 0 }).Should().Be("Donald Duck");
        modelHelper.GetModelData("friends[0].age", default).Should().Be(123);
        modelHelper.GetModelData("friends.age", new int[] { 0 }).Should().Be(123);
        modelHelper.GetModelData("friends[1].name.value", default).Should().Be("Dolly Duck");
        modelHelper.GetModelData("friends.name.value", new int[] { 1 }).Should().Be("Dolly Duck");

        // Run the same tests with JsonDataModel
        using var doc = JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(model));
        modelHelper = new JsonDataModel(doc.RootElement);
        modelHelper.GetModelData("friends.name.value", default).Should().BeNull();
        modelHelper.GetModelData("friends[0].name.value", default).Should().Be("Donald Duck");
        modelHelper.GetModelData("friends.name.value", new int[] { 0 }).Should().Be("Donald Duck");
        modelHelper.GetModelData("friends[0].age", default).Should().Be(123);
        modelHelper.GetModelData("friends.age", new int[] { 0 }).Should().Be(123);
        modelHelper.GetModelData("friends[1].name.value", default).Should().Be("Dolly Duck");
        modelHelper.GetModelData("friends.name.value", new int[] { 1 }).Should().Be("Dolly Duck");
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
                    Name = new()
                    {
                        Value = "Donald Duck"
                    },
                    Age = 123,
                },
                new()
                {
                    Name = new()
                    {
                        Value = "Dolly Duck"
                    },
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new()
                            {
                                Value = "Onkel Skrue",
                            },
                            Age = 2022,
                            Friends = new List<Friend>()
                            {
                                new()
                                {
                                    Name = new()
                                    {
                                        Value = "LykkeTiøringen"
                                    },
                                    Age = 23,
                                },
                                new()
                                {
                                    Name = new()
                                    {
                                        Value = "Madam mim"
                                    },
                                    Age = 23,
                                }
                            },
                        }
                    },
                }
            }
        };

        IDataModelAccessor modelHelper = new DataModel(model);
        modelHelper.GetModelData("friends[1].friends[0].name.value", default).Should().Be("Onkel Skrue");
        modelHelper.GetModelData("friends[1].friends.name.value", new int[] { 0, 0 }).Should().BeNull();
        modelHelper.GetModelData("friends[1].friends.name.value", new int[] { 1, 0 }).Should().BeNull("context indexes should not be used after literal index is used");
        modelHelper.GetModelData("friends[1].friends.name.value", new int[] { 1 }).Should().BeNull();
        modelHelper.GetModelData("friends.friends[0].name.value", new int[] { 1, 4, 5, 7 }).Should().Be("Onkel Skrue");
        modelHelper.GetModelDataCount("friends[1].friends", Array.Empty<int>()).Should().Be(1);
        modelHelper.GetModelDataCount("friends.friends", new int[] { 1 }).Should().Be(1);
        modelHelper.GetModelDataCount("friends[1].friends.friends", new int[] { 1, 0, 0 }).Should().BeNull();
        modelHelper.GetModelDataCount("friends[1].friends[0].friends", new int[] { 1, 0, 0 }).Should().Be(2);
        modelHelper.GetModelDataCount("friends.friends.friends", new int[] { 1, 0, 0 }).Should().Be(2);
        modelHelper.GetModelDataCount("friends.friends", new int[] { 1 }).Should().Be(1);

        // Run the same tests with JsonDataModel
        using var doc = JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(model));
        modelHelper = new JsonDataModel(doc.RootElement);
        modelHelper.GetModelData("friends[1].friends[0].name.value", default).Should().Be("Onkel Skrue");
        modelHelper.GetModelData("friends[1].friends.name.value", new int[] { 0, 0 }).Should().BeNull();
        modelHelper.GetModelData("friends[1].friends.name.value", new int[] { 1, 0 }).Should().BeNull("context indexes should not be used after literal index is used");
        modelHelper.GetModelData("friends[1].friends.name.value", new int[] { 1 }).Should().BeNull();
        modelHelper.GetModelData("friends.friends[0].name.value", new int[] { 1, 4, 5, 7 }).Should().Be("Onkel Skrue");
        modelHelper.GetModelDataCount("friends[1].friends", Array.Empty<int>()).Should().Be(1);
        modelHelper.GetModelDataCount("friends.friends", new int[] { 1 }).Should().Be(1);
        modelHelper.GetModelDataCount("friends[1].friends.friends", new int[] { 1, 0, 0 }).Should().BeNull();
        modelHelper.GetModelDataCount("friends[1].friends[0].friends", new int[] { 1, 0, 0 }).Should().Be(2);
        modelHelper.GetModelDataCount("friends.friends.friends", new int[] { 1, 0, 0 }).Should().Be(2);
        modelHelper.GetModelDataCount("friends.friends", new int[] { 1 }).Should().Be(1);
    }

    [Fact]
    public void TestRemoveFields()
    {
        var model = new Model()
        {
            Id = 2,
            Name = new()
            {
                Value = "Ivar"
            },
            Friends = new List<Friend>
            {
                new()
                {
                    Name = new()
                    {
                        Value = "Første venn"
                    },
                    Age = 1235,
                    Friends = new List<Friend>
                    {
                        new()
                        {
                            Name = new()
                            {
                                Value = "Første venn sin venn",
                            },
                            Age = 233
                        }
                    }
                }
            }
        };
        IDataModelAccessor modelHelper = new DataModel(model);
        model.Id.Should().Be(2);
        modelHelper.RemoveField("id");
        model.Id.Should().Be(default);

        model.Name.Value.Should().Be("Ivar");
        modelHelper.RemoveField("name");
        model.Name.Should().BeNull();

        model.Friends.First().Name!.Value.Should().Be("Første venn");
        modelHelper.RemoveField("friends[0].name.value");
        model.Friends.First().Name!.Value.Should().BeNull();
        modelHelper.RemoveField("friends[0].name");
        model.Friends.First().Name.Should().BeNull();
        model.Friends.First().Age.Should().Be(1235);

        model.Friends.First().Friends!.First().Age.Should().Be(233);
        modelHelper.RemoveField("friends[0].friends");
        model.Friends.First().Friends.Should().BeNull();
    }

    [Fact]
    public void TestErrorCases()
    {
        var modelHelper = new DataModel(
            new Model
            {
                Id = 3,
                Friends = new List<Friend>()
                {
                    new()
                    {
                        Name = new(){ Value = "Ole"},
                    }
                }
            });
        modelHelper.Invoking(m => m.GetModelData(".")).Should().Throw<DataModelException>().WithMessage("*empty part*");
        modelHelper.GetModelData("friends[0]").Should().BeOfType<Friend>().Which.Name?.Value.Should().Be("Ole");
        modelHelper.GetModelData("friends[3]").Should().BeNull();

        modelHelper.Invoking(m => m.AddIndicies("tull.sd", new int[] { 2 }))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Unknown model property tull in*");

        modelHelper.Invoking(m => m.AddIndicies("id[4]", new int[] { 6 }))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Index on non indexable property");
    }

    [Fact]
    public void TestEdgeCaseWithNonGenericEnumerableForCoverage()
    {
        // Test with erronious model with non-generic IEnumerable (special error for code coverage)
        var modelHelper = new DataModel(new
        {
            // ArrayList is not supported as a data model
            friends = new System.Collections.ArrayList() { 1, 2, 3 },
        });
        modelHelper.Invoking(m => m.AddIndicies("friends", new int[] { 0 }))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("DataModels must have generic IEnumerable<> implementation for list");
    }

    [Fact]
    public void TestAddIndicies()
    {
        IDataModelAccessor modelHelper = new DataModel(
            new Model
            {
                Id = 3,
                Friends = new List<Friend>()
                {
                    new()
                    {
                        Name = new(){ Value = "Ole"},
                    }
                }
            });

        // Plain add indicies
        modelHelper.AddIndicies("friends.friends", new int[] { 0, 1 }).Should().Be("friends[0].friends[1]");

        // Ignore extra indicies
        modelHelper.AddIndicies("friends.friends", new int[] { 0, 1, 4, 6 }).Should().Be("friends[0].friends[1]");

        // Don't add indicies if they are specified in input
        modelHelper.AddIndicies("friends[3]", new int[] { 0 }).Should().Be("friends[3]");

        // Seccond index is ignored if the first is explicit
        modelHelper.Invoking(m => m.AddIndicies("friends[0].friends", new int[] { 0, 3 }))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Missmatch*");
    }

    [Fact]
    public void AddIndicies_WhenGivenIndexOnNonIndexableProperty_ThrowsError()
    {
        IDataModelAccessor modelHelper = new DataModel(new Model { Id = 3, });

        // Throws because id is not indexable
        modelHelper.Invoking(m => m.AddIndicies("id[0]", new int[] { 1, 2, 3 }))
            .Should()
            .Throw<DataModelException>()
            .WithMessage("Index on non indexable property");
    }

    [Fact]
    public void RemoveField_WhenValueDoesNotExist_DoNothing()
    {
        var modelHelper = new DataModel(new Model());

        // real fields works, no error
        modelHelper.RemoveField("id");

        // non-existant-fields works, no error
        modelHelper.RemoveField("doesNotExist");

        // non-existant-fields in subfield works, no error
        modelHelper.RemoveField("friends.doesNotExist");
 
        // non-existant-fields in subfield works, no error
        modelHelper.RemoveField("friends[0].doesNotExist");
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
    public IEnumerable<Friend>? Friends { get; set; }
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
    public IEnumerable<Friend>? Friends { get; set; }
}