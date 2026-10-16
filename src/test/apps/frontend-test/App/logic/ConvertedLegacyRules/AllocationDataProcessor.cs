using Altinn.Platform.Storage.Interface.Models;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
#nullable enable
namespace Altinn.App.Logic.ConvertedLegacyRules;
public class AllocationDataProcessor : IDataProcessor
{
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language) => Task.CompletedTask;
    public async Task ProcessDataWrite(Instance instance, Guid? dataId, object data, object? previousData, string? language)
    {
        // Generated from legacy JavaScript. Review the retained source and test the upgraded app.
        if (data is not global::Altinn.App.Models.NestedGroup) return;
        var wrapper = FormDataWrapperFactory.Create(data, new DataType { Id = "nested-group" }, dataElement: null);
        var inputs = wrapper.Copy();
        await Rule_0(wrapper, inputs);
        await Task.CompletedTask;
    }
    // Rule allocation, function allocation
    // Input categories = AllocationCategories
    // Input Feed = FeedAllocation
    // Input Compost = CompostAllocation
    // Output outParam0 = AllocationHelper
    // (function (obj) {
    //     if (!obj.categories) return '100|false';
    //     var selected = obj.categories.split(',');
    //     var sum = 0;
    //     var complete = selected.length > 0;
    //     selected.forEach(function (category) {
    //       var value = obj[category];
    //       sum += +value;
    //       if (value == null) complete = false;
    //     });
    //     return `${100 - sum}|${complete && sum !== 100}`;
    //   })
    private Task Rule_0(IFormDataWrapper wrapper, IFormDataWrapper inputs)
    {
        var obj = new Dictionary<string, object?>
        {
            ["categories"] = JsInput(inputs.Get("AllocationCategories")),
            ["Feed"] = JsInput(inputs.Get("FeedAllocation")),
            ["Compost"] = JsInput(inputs.Get("CompostAllocation")),
        }
        ;
        var result = Calculate_0(obj);
        // JSON serialization sent non-finite JS numbers as null.
        if (result is double number && !double.IsFinite(number)) result = null;
        wrapper.Set("AllocationHelper", ExpressionValue.FromObject(result is JsUndefined ? null : result));
        return Task.CompletedTask;
    }
    private static object? Calculate_0(Dictionary<string, object?> obj)
    {
        object? local_0 = Undefined;
        object? local_1 = Undefined;
        object? local_2 = Undefined;
        if (JsTruthy((!JsTruthy(JsGet(obj, "categories")))))
        {
            return "100|false";
        }
        local_0 = JsSplit(JsGet(obj, "categories"), ",", false);
        local_1 = 0d;
        local_2 = (JsCompare(JsLength(local_0, false), 0d) > 0);
        foreach (var item_18 in JsItems(local_0))
        {
            object? local_4 = Undefined;
            local_4 = JsGet(obj, JsString(item_18));
            local_1 = JsAdd(local_1, JsNumber(local_4));
            if (JsTruthy(JsEquals(local_4, null)))
            {
                local_2 = false;
            }
        }
        return ("" + JsString((JsNumber(100d) - JsNumber(local_1))) + "|" + JsString(JsAnd(local_2, () => (!JsStrictEquals(local_1, 100d)))) + "");

    }
    private sealed class JsUndefined { }
    private static readonly object Undefined = new JsUndefined();
    private static object? JsInput(object? value) => value switch
    {
        string or bool => value,
        IConvertible convertible when convertible.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal =>
            Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture),
        _ => null,
    };
    private static object? JsGet(Dictionary<string, object?> obj, string key) =>
        obj.TryGetValue(key, out var value) ? value : Undefined;
    private static bool JsFiniteNumber(object? value) =>
        value is IConvertible number && number.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal
        && double.IsFinite(JsNumber(value));
    private static object? JsAnd(object? left, Func<object?> right) => JsTruthy(left) ? right() : left;
    private static object? JsOr(object? left, Func<object?> right) => JsTruthy(left) ? left : right();
    private static object? JsCoalesce(object? left, Func<object?> right) => left is null or JsUndefined ? right() : left;
    private static bool JsTruthy(object? value) => value switch
    {
        null or JsUndefined => false,
        bool boolean => boolean,
        string text => text.Length != 0,
        IConvertible convertible when convertible.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal =>
            JsNumber(value) is var number && number != 0 && !double.IsNaN(number),
        _ => true,
    };
    private static double JsNumber(object? value) => value switch
    {
        null => 0,
        bool boolean => boolean ? 1 : 0,
        string text => JsNumberText(text),
        IConvertible convertible when convertible.GetTypeCode() is >= TypeCode.SByte and <= TypeCode.Decimal =>
            Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture),
        _ => double.NaN,
    };
    private static string JsTrimText(string text) => text.Trim(
        '\u0009', '\u000A', '\u000B', '\u000C', '\u000D', '\u0020', '\u00A0', '\u1680',
        '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005', '\u2006', '\u2007',
        '\u2008', '\u2009', '\u200A', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF');
    private static double JsNumberText(string text)
    {
        text = JsTrimText(text);
        if (text.Length == 0) return 0;
        if (text.StartsWith("0x", StringComparison.OrdinalIgnoreCase)) return JsRadix(text[2..], 16, false);
        if (text.StartsWith("0b", StringComparison.OrdinalIgnoreCase)) return JsRadix(text[2..], 2, false);
        if (text.StartsWith("0o", StringComparison.OrdinalIgnoreCase)) return JsRadix(text[2..], 8, false);
        if (!System.Text.RegularExpressions.Regex.IsMatch(text,
            @"\A[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)\z")) return double.NaN;
        return double.TryParse(text, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var number) ? number : double.NaN;
    }
    private static double JsRadix(string text, int radix, bool prefix)
    {
        var value = System.Numerics.BigInteger.Zero;
        int count = 0;
        foreach (char character in text)
        {
            int digit = character is >= '0' and <= '9' ? character - '0' :
                character is >= 'a' and <= 'z' ? character - 'a' + 10 :
                character is >= 'A' and <= 'Z' ? character - 'A' + 10 : -1;
            if (digit < 0 || digit >= radix) return prefix && count > 0 ? (double)value : double.NaN;
            value = value * radix + digit;
            count++;
        }
        return count == 0 ? double.NaN : (double)value;
    }
    private static double JsParseInt(object? value)
    {
        var text = JsTrimText(JsString(value));
        bool negative = text.StartsWith('-');
        if (text.StartsWith('-') || text.StartsWith('+')) text = text[1..];
        bool hexadecimal = text.StartsWith("0x", StringComparison.OrdinalIgnoreCase);
        var number = JsRadix(hexadecimal ? text[2..] : text, hexadecimal ? 16 : 10, true);
        return negative ? -number : number;
    }
    private static object JsAdd(object? left, object? right) =>
        left is string || right is string ? JsString(left) + JsString(right) : JsNumber(left) + JsNumber(right);
    private static string JsString(object? value) => value switch
    {
        JsUndefined => "undefined",
        null => "null",
        bool boolean => boolean ? "true" : "false",
        double number => JsNumberString(number),
        _ => Convert.ToString(value, System.Globalization.CultureInfo.InvariantCulture) ?? "",
    };
    private static string JsNumberString(double number)
    {
        if (number == 0) return "0";
        var text = number.ToString("R", System.Globalization.CultureInfo.InvariantCulture);
        var parts = text.Split('E');
        if (parts.Length == 1) return text;
        int exponent = int.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture);
        if (exponent < -6 || exponent >= 21)
            return parts[0] + "e" + (exponent >= 0 ? "+" : "") + exponent.ToString(System.Globalization.CultureInfo.InvariantCulture);
        bool negative = parts[0].StartsWith('-');
        var digits = parts[0].TrimStart('-').Replace(".", "", StringComparison.Ordinal);
        int position = exponent + 1;
        var expanded = position <= 0 ? "0." + new string('0', -position) + digits :
            position >= digits.Length ? digits + new string('0', position - digits.Length) : digits.Insert(position, ".");
        return negative ? "-" + expanded : expanded;
    }
    private static bool JsEquals(object? left, object? right) =>
        left is null or JsUndefined || right is null or JsUndefined ?
            left is null or JsUndefined && right is null or JsUndefined :
        left is string a && right is string b ? a == b : JsNumber(left) == JsNumber(right);
    private static bool JsStrictEquals(object? left, object? right) =>
        left is JsUndefined || right is JsUndefined ? left is JsUndefined && right is JsUndefined :
        left is null || right is null ? left is null && right is null :
        left is string a && right is string b ? a == b :
        left is bool x && right is bool y ? x == y :
        left is double l && right is double r ? l == r : ReferenceEquals(left, right);
    private static object? JsToString(object? value, bool optional)
    {
        if (value is null or JsUndefined)
            return optional ? Undefined : throw new InvalidOperationException("Cannot call toString on null or undefined.");
        return JsString(value);
    }
    private static object? JsTrim(object? value, bool optional) => value switch
    {
        string text => JsTrimText(text),
        null or JsUndefined when optional => Undefined,
        _ => throw new InvalidOperationException("trim requires a string."),
    };
    private static object? JsIncludes(object? value, object? search, bool optional) => value switch
    {
        string text => text.Contains(JsString(search), StringComparison.Ordinal),
        null or JsUndefined when optional => Undefined,
        _ => throw new InvalidOperationException("includes requires a string."),
    };
    private static object JsSplit(object? value, object? separator, bool optional)
    {
        if (value is null or JsUndefined && optional) return Undefined;
        if (value is not string text) throw new InvalidOperationException("split requires a string.");
        if (separator is JsUndefined) return new[] { text };
        var delimiter = JsString(separator);
        return delimiter.Length == 0 ? text.Select(character => character.ToString()).ToArray() :
            text.Split(new[] { delimiter }, StringSplitOptions.None);
    }
    private static IEnumerable<object?> JsItems(object? value) => value is string[] items ? items :
        throw new InvalidOperationException("forEach requires a split list.");
    private static object? JsLength(object? value, bool optional) => value switch
    {
        string text => (double)text.Length,
        string[] items => (double)items.Length,
        null or JsUndefined when optional => Undefined,
        null or JsUndefined => throw new InvalidOperationException("Cannot read length of null or undefined."),
        _ => Undefined,
    };
    private static bool JsDigits(object? value) => System.Text.RegularExpressions.Regex.IsMatch(
        JsString(value), @"\A[0-9]+\z");
    private static object? JsFixed(object? value, object? digits, bool optional)
    {
        if (value is null or JsUndefined && optional) return Undefined;
        if (value is not double number) throw new InvalidOperationException("toFixed requires a number.");
        var places = Math.Truncate(JsNumber(digits));
        if (double.IsNaN(places)) places = 0;
        if (places < 0 || places > 100) throw new ArgumentOutOfRangeException(nameof(digits));
        return JsToFixed(number, (int)places);
    }
    private static double JsCompare(object? left, object? right)
    {
        if (left is string a && right is string b) return string.CompareOrdinal(a, b);
        var x = JsNumber(left); var y = JsNumber(right);
        return double.IsNaN(x) || double.IsNaN(y) ? double.NaN : x == y ? 0 : x < y ? -1 : 1;
    }
    private static double JsRound(double value)
    {
        if (!double.IsFinite(value) || value == 0 || Math.Abs(value) >= 4503599627370496d) return value;
        var floor = Math.Floor(value);
        var rounded = value - floor < 0.5 ? floor : floor + 1;
        return rounded == 0 ? Math.CopySign(0, value) : rounded;
    }
    private static double JsParseFloat(object? value)
    {
        var match = System.Text.RegularExpressions.Regex.Match(JsTrimText(JsString(value)),
            @"^[+-]?(?:Infinity|(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)");
        return match.Success && double.TryParse(match.Value, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var number) ? number : double.NaN;
    }
    private static string JsToFixed(double value, int digits)
    {
        if (digits < 0 || digits > 100) throw new ArgumentOutOfRangeException(nameof(digits));
        if (!double.IsFinite(value) || Math.Abs(value) >= 1e21) return JsString(value);
        var bits = BitConverter.DoubleToInt64Bits(Math.Abs(value));
        int exponent = (int)((bits >> 52) & 0x7ff);
        var significant = new System.Numerics.BigInteger(bits & 0xfffffffffffffL);
        if (exponent != 0) significant += System.Numerics.BigInteger.One << 52;
        int shift = exponent == 0 ? -1074 : exponent - 1075;
        var scaled = significant * System.Numerics.BigInteger.Pow(10, digits);
        if (shift >= 0) scaled <<= shift;
        else
        {
            var divisor = System.Numerics.BigInteger.One << -shift;
            scaled = System.Numerics.BigInteger.DivRem(scaled, divisor, out var remainder);
            if (remainder * 2 >= divisor) scaled++;
        }
        var text = scaled.ToString(System.Globalization.CultureInfo.InvariantCulture).PadLeft(digits + 1, '0');
        if (digits > 0) text = text.Insert(text.Length - digits, ".");
        return value < 0 ? "-" + text : text;
    }
}
