using Altinn.App.Api.Mappers;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Mappers;

public class SimpleInstanceMapperTests
{
    [Fact]
    public void MapInstanceListToSimpleInstanceList_Substitutes_LastChangedBy_FromUserDict()
    {
        // Arrange
        var instances = new List<Instance>
        {
            new Instance
            {
                Id = "1",
                LastChanged = DateTime.Today,
                LastChangedBy = "1",
            },
            new Instance
            {
                Id = "2",
                LastChanged = DateTime.Today,
                LastChangedBy = "two",
            },
        };
        var userDictionary = new Dictionary<string, string> { { "1", "User1" }, { "two", "User2" } };
        var expected = new List<SimpleInstance>
        {
            new SimpleInstance
            {
                Id = "1",
                LastChanged = DateTime.Today,
                LastChangedBy = "User1",
            },
            new SimpleInstance
            {
                Id = "2",
                LastChanged = DateTime.Today,
                LastChangedBy = "User2",
            },
        };

        // Act
        var simpleInstances = SimpleInstanceMapper.MapInstanceListToSimpleInstanceList(instances, userDictionary);

        // Assert
        Assert.Equal(expected.Count, simpleInstances.Count);
        simpleInstances.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void MapInstanceListToSimpleInstanceList_Empty_LastChangedBy_When_Not_In_UserDict_Or_Unset()
    {
        // Arrange
        var instances = new List<Instance>
        {
            new Instance
            {
                Id = "1",
                LastChanged = DateTime.Today,
                LastChangedBy = "unknown-1",
            },
            new Instance { Id = "2", LastChanged = DateTime.Today },
        };
        var userDictionary = new Dictionary<string, string> { { "1", "User1" }, { "two", "User2" } };
        var expected = new List<SimpleInstance>
        {
            new SimpleInstance
            {
                Id = "1",
                LastChanged = DateTime.Today,
                LastChangedBy = "",
            },
            new SimpleInstance
            {
                Id = "2",
                LastChanged = DateTime.Today,
                LastChangedBy = "",
            },
        };

        // Act
        var simpleInstances = SimpleInstanceMapper.MapInstanceListToSimpleInstanceList(instances, userDictionary);

        // Assert
        Assert.Equal(expected.Count, simpleInstances.Count);
        simpleInstances.Should().BeEquivalentTo(expected);
    }
}
