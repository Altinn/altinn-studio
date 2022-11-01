using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Reflection;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Assertions;

[ExcludeFromCodeCoverage]
public static class TypeAssertions
{
    public static void IsEquivalentTo(Type expected, Type actual)
    {
        if (expected.IsPrimitive || expected == typeof(string) || expected == typeof(DateTime))
        {
            expected.Should().Be(actual);
            return;
        }

        expected.Name.Should().Be(actual.Name);
        expected.Namespace.Should().Be(actual.Namespace);
        expected.IsArray.Should().Be(actual.IsArray);
        expected.IsClass.Should().Be(actual.IsClass);
        expected.IsGenericType.Should().Be(actual.IsGenericType);
        if (expected.IsGenericType)
        {
            foreach (var expectedArg in expected.GenericTypeArguments)
            {
                var actualArg = actual.GenericTypeArguments.Single(x => x.Name == expectedArg.Name);
                IsEquivalentTo(expectedArg, actualArg);
            }
        }

        if (expected.IsClass)
        {
            IsEquivalentTo(expected.GetFields(), actual.GetFields());
            IsEquivalentTo(expected.GetProperties(), actual.GetProperties());
        }

        IsEquivalentTo(expected.Attributes, actual.Attributes);
        IsEquivalentTo(expected.CustomAttributes, actual.CustomAttributes);
    }

    private static void IsEquivalentTo(IReadOnlyCollection<FieldInfo> expected, IReadOnlyCollection<FieldInfo> actual)
    {
        expected.Count.Should().Be(actual.Count);
        foreach (var expectedItem in expected)
        {
            var actualItem = actual.Single(x => x.Name == expectedItem.Name);
            IsEquivalentTo(expectedItem, actualItem);
        }
    }

    private static void IsEquivalentTo(FieldInfo expected, FieldInfo actual)
    {
        expected.Name.Should().Be(actual.Name);
        IsEquivalentTo(expected.FieldType, actual.FieldType);
        IsEquivalentTo(expected.CustomAttributes, actual.CustomAttributes);
        expected.IsPrivate.Should().Be(actual.IsPrivate);
        expected.IsPublic.Should().Be(actual.IsPublic);
    }

    private static void IsEquivalentTo(IReadOnlyCollection<PropertyInfo> expected, IReadOnlyCollection<PropertyInfo> actual)
    {
        expected.Count.Should().Be(actual.Count);
        {
            foreach (var expectedItem in expected)
            {
                var actualItem = actual.Single(x => x.Name == expectedItem.Name);
                IsEquivalentTo(expectedItem, actualItem);
            }
        }
    }

    private static void IsEquivalentTo(PropertyInfo expected, PropertyInfo actual)
    {
        expected.Name.Should().Be(actual.Name);
        IsEquivalentTo(expected.PropertyType, actual.PropertyType);
    }

    private static void IsEquivalentTo(IEnumerable<CustomAttributeData> expected, IEnumerable<CustomAttributeData> actual)
    {
        foreach (var item in expected)
        {
            Assert.Single(actual.Where(x => x.ToString() == item.ToString()));
        }
    }

    private static void IsEquivalentTo(TypeAttributes expected, TypeAttributes actual)
    {
        expected.Should().Be(actual);
    }
}
