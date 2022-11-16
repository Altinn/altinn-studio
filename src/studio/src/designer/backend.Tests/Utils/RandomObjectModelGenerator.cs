using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using Fare;
using RandomTestValues;

namespace Designer.Tests.Utils;

/// <summary>
/// Dynamically creates random object based on type, respecting restrictions added in annotation.
/// Class is not meant to be used widely. It's specific for Model converted from json schema to c# class.
/// Ideally third party library should be used for generating such object.
/// </summary>
[ExcludeFromCodeCoverage]
public static class RandomObjectModelGenerator
{
    public static object GenerateValidRandomObject(Type type)
    {
        var obj = Activator.CreateInstance(type);
        PopulateObjectWithRandomData(obj);
        return obj;
    }

    private static void PopulateObjectWithRandomData(object obj)
    {
        var properties = obj.GetType().GetProperties();
        foreach (var property in properties)
        {
            if (IsPrimitive(property.PropertyType))
            {
                PopulatePrimitiveProperty(obj, property);
            }
            else if (property.PropertyType.IsGenericType &&
                     property.PropertyType.GetGenericTypeDefinition() == typeof(List<>))
            {
                PopulateList(obj, property);
            }
            else
            {
                var emptyObj = Activator.CreateInstance(property.PropertyType);
                PopulateObjectWithRandomData(emptyObj);
                property.SetValue(obj, emptyObj);
            }
        }
    }

    private static void PopulatePrimitiveProperty(object obj, PropertyInfo property)
    {
        property.SetValue(obj, GeneratePrimitiveType(property.PropertyType, property.CustomAttributes));
    }

    private static object GeneratePrimitiveType(Type type, IEnumerable<CustomAttributeData> restrictions = null)
    {
        if (type == typeof(string))
        {
            return GenerateString(restrictions);
        }

        if (IsNumberType(type))
        {
            return GenerateNumberType(type, restrictions);
        }

        if (type == typeof(DateTime))
        {
            return RandomValue.DateTime();
        }

        if (type == typeof(bool))
        {
            return RandomValue.Bool();
        }

        throw new Exception("Not primitive type");
    }

    private static string GenerateString(IEnumerable<CustomAttributeData> restrictions = null)
    {
        var attributeData = restrictions?.ToArray();
        var minlength = attributeData?.GetAttributeValue<int?, MinLengthAttribute>();
        var maxlength = attributeData?.GetAttributeValue<int?, MaxLengthAttribute>();
        var pattern = attributeData?.GetAttributeValue<string, RegularExpressionAttribute>();

        if (!string.IsNullOrWhiteSpace(pattern))
        {
            return new Xeger(pattern).Generate();
        }

        return RandomValue.String(CalculateStringLength(minlength, maxlength));
    }

    private static TValue GetAttributeValue<TValue, TAttributeType>(this IEnumerable<CustomAttributeData> restrictions)
    {
        return (TValue)restrictions?.FirstOrDefault(x => x.AttributeType == typeof(TAttributeType))
            ?.ConstructorArguments.FirstOrDefault().Value;
    }

    private static (object LowerLimit, object UpperLimit) GetRangeLimits(this IEnumerable<CustomAttributeData> restrictions)
    {
        if (restrictions is null)
        {
            return (null, null);
        }

        var rangeAttribute = restrictions?.FirstOrDefault(x => x.AttributeType == typeof(RangeAttribute));
        object lowerLimit = null;
        object upperLimit = null;
        if (rangeAttribute?.ConstructorArguments.Count == 2)
        {
            lowerLimit = rangeAttribute.ConstructorArguments[0].Value;
            upperLimit = rangeAttribute.ConstructorArguments[1].Value;
        }

        return (lowerLimit, upperLimit);
    }

    private static int CalculateStringLength(int? minLength, int? maxLength)
    {
        const int usualLength = 10;
        if (minLength is not null && maxLength is not null)
        {
            return RandomValue.Int(minLength.Value, maxLength.Value);
        }

        if (minLength is not null)
        {
            return RandomValue.Int(minLength.Value, Math.Max(usualLength, minLength.Value + 1));
        }

        if (maxLength is not null)
        {
            return RandomValue.Int(0, maxLength.Value);
        }

        return usualLength;
    }

    private static object GenerateNumberType(Type type, IEnumerable<CustomAttributeData> restrictions = null)
    {
        var (lowerLimit, upperLimit) = restrictions.GetRangeLimits();
        var hasRange = lowerLimit is not null && upperLimit is not null;
        var pattern = restrictions?.GetAttributeValue<string, RegularExpressionAttribute>();
        var random = new Random();

        if (type == typeof(int))
        {
            if (hasRange)
            {
                return random.Next((int)lowerLimit, (int)upperLimit);
            }

            if (!string.IsNullOrWhiteSpace(pattern))
            {
                return int.Parse(new Xeger(pattern).Generate());
            }

            return random.Next();
        }

        if (type == typeof(short))
        {
            if (hasRange)
            {
                return (short)random.Next((int)lowerLimit, (int)upperLimit);
            }

            if (!string.IsNullOrWhiteSpace(pattern))
            {
                return short.Parse(new Xeger(pattern).Generate());
            }

            return (short)random.Next(short.MinValue, short.MaxValue);
        }

        if (type == typeof(decimal))
        {
            if (hasRange)
            {
                var next = random.NextDouble();
                var rnd = next + (next * (Convert.ToDouble(upperLimit) - Convert.ToDouble(lowerLimit)));
                return new decimal(rnd);
            }

            if (!string.IsNullOrWhiteSpace(pattern))
            {
                return decimal.Parse(new Xeger(pattern).Generate());
            }

            return new decimal(random.NextDouble());
        }

        if (type == typeof(double))
        {
            if (hasRange)
            {
                var next = random.NextDouble();
                return next + (next * (Convert.ToDouble(upperLimit) - Convert.ToDouble(lowerLimit)));
            }

            if (!string.IsNullOrWhiteSpace(pattern))
            {
                return double.Parse(new Xeger(pattern).Generate());
            }

            return random.NextDouble();
        }

        if (type == typeof(long))
        {
            if (hasRange)
            {
                return random.NextInt64((long)lowerLimit, (long)upperLimit);
            }

            if (!string.IsNullOrWhiteSpace(pattern))
            {
                return long.Parse(new Xeger(pattern).Generate());
            }

            return random.NextInt64();
        }

        throw new Exception("Non supported number type");
    }

    private static void PopulateList(object obj, PropertyInfo property, int size = 5)
    {
        var argumentType = property.PropertyType.GetGenericArguments().First();
        var list = (IList)Activator.CreateInstance(property.PropertyType);

        var isPrimitive = IsPrimitive(argumentType);

        for (var i = 0; i < size; i++)
        {
            if (isPrimitive)
            {
                list.Add(GeneratePrimitiveType(argumentType));
                continue;
            }

            var listItem = Activator.CreateInstance(argumentType);
            PopulateObjectWithRandomData(listItem);
            list.Add(listItem);
        }

        property.SetValue(obj, list);
    }

    private static bool IsPrimitive(Type type)
    {
        return type.IsPrimitive || type == typeof(string) || type == typeof(DateTime) || type == typeof(decimal);
    }

    private static bool IsNumberType(Type type)
    {
        return type == typeof(int) || type == typeof(short) || type == typeof(decimal) || type == typeof(double) || type == typeof(long);
    }
}
