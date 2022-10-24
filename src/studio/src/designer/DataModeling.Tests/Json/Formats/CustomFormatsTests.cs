using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json.Nodes;
using Altinn.Studio.DataModeling.Json.Formats;
using FluentAssertions;
using Xunit;

namespace DataModeling.Tests.Json.Formats;

public class CustomFormatsTests
{
    private static readonly Type Type = typeof(CustomFormats);
    private const string JsonStructure = @"{
                                              ""DateField"": ""1994-01"",
                                              ""Number"": 100,
                                              ""Object"": {""Area"":""Økern"",""Description"":""Portal""}
                                            }";

    [Theory]
    [InlineData("DateTest", true)]
    [InlineData("Number", true)]
    [InlineData("Object", true)]
    public void TestDateFormat(string property, bool expected)
    {
        var checkDateMethod = Type
            .GetMethods(BindingFlags.Static | BindingFlags.NonPublic)
            .First(x => x.Name == "CheckDate" && x.IsPrivate && x.IsStatic);

        var node = JsonNode.Parse(JsonStructure);

        List<object> objects = new List<object>();
        objects.Add(node[property]);

        var result = checkDateMethod.Invoke(null, objects.ToArray());
        expected.Should().Be((bool)result);
    }
}
