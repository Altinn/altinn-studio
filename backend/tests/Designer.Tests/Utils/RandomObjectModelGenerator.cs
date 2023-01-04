using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Reflection;
using Fare;

namespace Designer.Tests.Utils;

/// <summary>
/// Dynamically creates random object based on type, respecting restrictions added in annotation.
/// Class is not meant to be used widely. It's specific for Model converted from json schema to c# class.
/// Ideally third party library should be used for generating such object.
/// </summary>
[ExcludeFromCodeCoverage]
public static class RandomObjectModelGenerator
{
    private static readonly Random Random = new();

    private static bool _roundDecimalsToZeroPlaces = true;

    /// <summary>
    /// Setup to round decimal values to 0 decimal places.
    /// Currently integers in xsd are represented as decimals in c# class.
    /// </summary>
    public static void RoundDecimalToZeroDecimalPlaces(bool generateDecimalAsRound) => _roundDecimalsToZeroPlaces = generateDecimalAsRound;

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
            else if (Nullable.GetUnderlyingType(property.PropertyType) != null)
            {
                var underlyingType = Nullable.GetUnderlyingType(property.PropertyType);
                if (IsPrimitive(underlyingType))
                {
                    property.SetValue(obj, GeneratePrimitiveType(underlyingType));
                }
                else
                {
                    throw new Exception("Unsupported type!");
                }
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
        // Skip fixed data from seres
        if (property.GetValue(obj) is not null && property.PropertyType == typeof(string))
        {
            return;
        }

        property.SetValue(obj, GeneratePrimitiveType(property.PropertyType, property.CustomAttributes));
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
            return new DateTime(Random.Next(1990, 2030), Random.Next(1, 12), Random.Next(1, 28));
        }

        if (type == typeof(bool))
        {
            return Random.Next(2) == 1;
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
            return new Xeger(pattern, Random).Generate();
        }

        var length = CalculateStringLength(minlength, maxlength);
        var allowedChars = GetAllowedCharacters().ToList();

        return string.Join(string.Empty, Enumerable.Repeat(0, length).Select(_ => allowedChars[Random.Next(0, allowedChars.Count)]));
    }

    private static object GenerateNumberType(Type type, IEnumerable<CustomAttributeData> restrictions = null)
    {
        var (lowerLimit, upperLimit) = restrictions.GetRangeLimits();
        var pattern = restrictions?.GetAttributeValue<string, RegularExpressionAttribute>();

        if (!string.IsNullOrWhiteSpace(pattern))
        {
            return CreateTypeFromRegex(type, pattern);
        }

        if (type == typeof(int))
        {
            return NumberRangeGenerator(lowerLimit, upperLimit, d => Convert.ToInt32(Math.Round(d, 0)));
        }

        if (type == typeof(short))
        {
            return NumberRangeGenerator(lowerLimit, upperLimit, d => Convert.ToInt16(Math.Round(d, 0)));
        }

        if (type == typeof(decimal))
        {
            return NumberRangeGenerator(lowerLimit, upperLimit, d => Convert.ToDecimal(_roundDecimalsToZeroPlaces ? Math.Round(d, 0) : d));
        }

        if (type == typeof(double))
        {
            return NumberRangeGenerator(lowerLimit, upperLimit, d => d);
        }

        if (type == typeof(long))
        {
            return NumberRangeGenerator(lowerLimit, upperLimit, d => Convert.ToInt64(Math.Round(d, 0)));
        }

        throw new Exception("Non supported number type");
    }

    private static T NumberRangeGenerator<T>(object lowerLimit, object upperLimit, Func<double, T> fromDoubleGenerator)
        where T : IComparable
    {
        var hasRange = lowerLimit is not null && upperLimit is not null;
        if (hasRange)
        {
            var rnd = GenerateRandomDoubleWithinLimits(Convert.ToDouble(lowerLimit), Convert.ToDouble(upperLimit));
            return fromDoubleGenerator.Invoke(rnd);
        }

        var noLimitsRandom = Random.NextDouble() * Random.Next();
        return fromDoubleGenerator.Invoke(noLimitsRandom);
    }

    private static IEnumerable<char> GetAllowedCharacters()
    {
        static IEnumerable<char> UnicodeRange(int from, int to) => Enumerable.Range(from, to - from + 1).Select(i => (char)i);

        return UnicodeRange(65, 90) // upper alfa
            .Union(UnicodeRange(97, 122)) // lower alfa
            .Union(UnicodeRange(48, 57)) // numeric
            .Union(UnicodeRange(32, 32)) // space
            .Union(UnicodeRange(45, 45)) // hyphen-minus
            .Union(UnicodeRange(216, 216)) // Ø
            .Union(UnicodeRange(248, 248)) // ø
            .Union(UnicodeRange(230, 230)) // æ
            .Union(UnicodeRange(198, 198)) // Æ
            .Union(UnicodeRange(229, 229)) // å
            .Union(UnicodeRange(197, 197)); // Å
    }

    private static TValue GetAttributeValue<TValue, TAttributeType>(this IEnumerable<CustomAttributeData> restrictions)
    {
        return (TValue)restrictions?.FirstOrDefault(x => x.AttributeType == typeof(TAttributeType))
            ?.ConstructorArguments.FirstOrDefault().Value;
    }

    private static (object LowerLimit, object UpperLimit) GetRangeLimits(
        this IEnumerable<CustomAttributeData> restrictions)
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
            return Random.Next(minLength.Value, maxLength.Value);
        }

        if (minLength is not null)
        {
            return Random.Next(minLength.Value, Math.Max(usualLength, minLength.Value + 1));
        }

        if (maxLength is not null)
        {
            return Random.Next(0, maxLength.Value);
        }

        return usualLength;
    }

    private static double GenerateRandomDoubleWithinLimits(double lowerLimit, double upperLimit)
    {
        const double minVal = -1_000_000_000_000;
        const double maxVal = 1_000_000_000_000;
        var lower = lowerLimit.Equals(double.MinValue) ? minVal : lowerLimit;
        var upper = upperLimit.Equals(double.MaxValue) ? maxVal : upperLimit;
        var next = Random.NextDouble();

        return Convert.ToDouble(lower) + (next * (Convert.ToDouble(upper) - Convert.ToDouble(lower)));
    }

    private static object CreateTypeFromRegex(Type type, string pattern)
    {
        var converter = TypeDescriptor.GetConverter(type);

        return converter.ConvertFrom(new Xeger(pattern, Random).Generate());
    }

    private static bool IsPrimitive(Type type)
    {
        return type.IsPrimitive || type == typeof(string) || type == typeof(DateTime) || type == typeof(decimal);
    }

    private static bool IsNumberType(Type type)
    {
        return type == typeof(int) || type == typeof(short) || type == typeof(decimal) || type == typeof(double) ||
               type == typeof(long);
    }
}
