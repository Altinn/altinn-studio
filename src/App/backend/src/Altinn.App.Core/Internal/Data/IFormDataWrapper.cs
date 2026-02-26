using System.Collections.Concurrent;
using System.Reflection;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Interface for a wrapper around a data model, that allows for easy access to fields and rows in the model.
///
/// Implementations for each data model type will be created by a source generator and retrieved by the
/// <see cref="FormDataWrapperFactory"/>
/// </summary>
public interface IFormDataWrapper
{
    /// <summary>
    /// Get the C# class type of this form data
    /// </summary>
    public Type BackingDataType { get; }

    /// <summary>
    /// Get the backing data model as a T.
    /// Use &lt;object&gt; if you don't know the type.
    /// </summary>
    /// <code>
    ///     // Get the raw data model as (object)
    ///     var rawData = formDataWrapper.BackingData&lt;object&gt;();
    /// </code>
    /// <exception cref="InvalidCastException">If the wrapped object is not a subtype of T</exception>
    public T BackingData<T>()
        where T : class;

    /// <summary>
    /// Get the value at the given path from the data model
    /// </summary>
    /// <param name="path">The dotted path to use (including inline indexes)</param>
    object? Get(ReadOnlySpan<char> path);

    /// <summary>
    /// Set the value at the given path in the data model
    /// </summary>
    /// <param name="path">The dotted path to use (including inline indexes)</param>
    /// <param name="value">The value to set (will be automatically converted to the target type if possible)</param>
    /// <returns>True if the value was set successfully, false if the path could not be resolved or type conversion failed</returns>
    bool Set(ReadOnlySpan<char> path, ExpressionValue value);

    /// <summary>
    /// Remove the field at the given path
    /// If the path points to a row (last segment is a list with an explicit [index]), the row will be removed or set to null based on rowRemovalOption
    /// </summary>
    void RemoveField(ReadOnlySpan<char> path, RowRemovalOption rowRemovalOption);

    /// <summary>
    /// Typically you'd never call this low-level method, but rather use one of the extension methods
    /// </summary>
    /// <remarks>
    /// To support relative references, we need to be able to add the indexes from the relative target to the path
    /// </remarks>
    /// <param name="path">The current path (possibly with unset indexes on some collections)</param>
    /// <param name="rowIndexes">Extra rowIndexes that should be added (from context)</param>
    /// <param name="buffer">
    ///     A buffer that the method can work with, that is large enough to hold the full indexed path
    ///     (Typically we use path.Length + rowIndexes.Length * 12, as int.MaxValue.ToString().Length = 10 + 2 characters for "[]")
    /// </param>
    /// <returns>The indexed path as a span that references buffer, or an empty span if a fully indexed path could not be constructed</returns>
    ReadOnlySpan<char> AddIndexToPath(ReadOnlySpan<char> path, ReadOnlySpan<int> rowIndexes, Span<char> buffer);

    /// <summary>
    /// Make a deep copy of the form data
    /// </summary>
    IFormDataWrapper Copy();

    /// <summary>
    /// Set all Guid AltinnRowId fields to Guid.Empty (so that they don't get serialized to xml or json)
    /// </summary>
    void RemoveAltinnRowIds();

    /// <summary>
    /// Set all Guid AltinnRowId fields that are Guid.Empty to Guid.NewGuid (so that we have an addressable id for the row when diffing for patches)
    /// </summary>
    void InitializeAltinnRowIds();
}

/// <summary>
/// Extension methods for <see cref="IFormDataWrapper"/>
/// </summary>
internal static class FormDataWrapperExtensions
{
    /// <summary>
    /// Get the value at the given path directly as the type T. Same as (T)Get(path, rowIndexes)
    /// </summary>
    public static T? Get<T>(
        this IFormDataWrapper formDataWrapper,
        ReadOnlySpan<char> path = default,
        ReadOnlySpan<int> rowIndexes = default
    )
    {
        object? data = formDataWrapper.Get(path, rowIndexes);
        return data switch
        {
            null => default,
            T t => t,
            _ => throw new ArgumentException(
                $"Path {path} does not point to a {typeof(T).FullName}, but {data.GetType().FullName}"
            ),
        };
    }

    /// <summary>
    /// Simple way to get a value from the form data model adding indexes from context
    /// </summary>
    public static object? Get(
        this IFormDataWrapper formDataWrapper,
        ReadOnlySpan<char> path,
        ReadOnlySpan<int> rowIndexes = default
    )
    {
        int len = GetMaxBufferLength(path, rowIndexes);
        if (len <= 512)
        {
            Span<char> buffer = stackalloc char[len];
            var indexedPath = formDataWrapper.AddIndexToPath(path, rowIndexes, buffer);
            return indexedPath.IsEmpty ? null : formDataWrapper.Get(indexedPath);
        }

        char[] pool = System.Buffers.ArrayPool<char>.Shared.Rent(len);
        try
        {
            var indexedPath = formDataWrapper.AddIndexToPath(path, rowIndexes, pool);
            return indexedPath.IsEmpty ? null : formDataWrapper.Get(indexedPath);
        }
        finally
        {
            System.Buffers.ArrayPool<char>.Shared.Return(pool);
        }
    }

    /// <summary>
    /// Simple way to set a value in the form data model adding indexes from context
    /// </summary>
    /// <returns>True if the value was set successfully, false if the path could not be resolved or type conversion failed</returns>
    public static bool Set(
        this IFormDataWrapper formDataWrapper,
        ReadOnlySpan<char> path,
        ExpressionValue value,
        ReadOnlySpan<int> rowIndexes
    )
    {
        int len = GetMaxBufferLength(path, rowIndexes);
        if (len <= 512)
        {
            Span<char> buffer = stackalloc char[len];
            var indexedPath = formDataWrapper.AddIndexToPath(path, rowIndexes, buffer);
            return !indexedPath.IsEmpty && formDataWrapper.Set(indexedPath, value);
        }

        char[] pool = System.Buffers.ArrayPool<char>.Shared.Rent(len);
        try
        {
            var indexedPath = formDataWrapper.AddIndexToPath(path, rowIndexes, pool);
            return !indexedPath.IsEmpty && formDataWrapper.Set(indexedPath, value);
        }
        finally
        {
            System.Buffers.ArrayPool<char>.Shared.Return(pool);
        }
    }

    /// <summary>
    /// Get a string representation of the path with indexes from context added
    /// </summary>
    /// <returns>The path with indexes added or null if a fully indexed path could not be constructed</returns>
    public static string? AddIndexToPath(
        this IFormDataWrapper formDataWrapper,
        ReadOnlySpan<char> path,
        ReadOnlySpan<int> rowIndexes
    )
    {
        int len = GetMaxBufferLength(path, rowIndexes);
        if (len <= 512)
        {
            Span<char> buffer = stackalloc char[len];
            var indexedPath = formDataWrapper.AddIndexToPath(path, rowIndexes, buffer);
            return indexedPath.IsEmpty ? null : indexedPath.ToString();
        }
        else
        {
            char[] pool = System.Buffers.ArrayPool<char>.Shared.Rent(len);
            try
            {
                var indexedPath = formDataWrapper.AddIndexToPath(path, rowIndexes, pool);
                return indexedPath.IsEmpty ? null : indexedPath.ToString();
            }
            finally
            {
                System.Buffers.ArrayPool<char>.Shared.Return(pool);
            }
        }
    }

    /// <summary>
    /// Get the number of rows in the collection at the given path
    /// Returns null if the path does not resolve to an ICollection&lt;T&gt; (or is missing)
    /// </summary>
    public static int? GetRowCount(
        this IFormDataWrapper formDataWrapper,
        ReadOnlySpan<char> path,
        ReadOnlySpan<int> rowIndexes
    )
    {
        object? data = formDataWrapper.Get(path, rowIndexes);
        return data is null ? null : CollectionHelper.GetCount(data);
    }

    /// <summary>
    /// We need some magic to cache the accessor method for the .Count property on ICollection&lt;T&gt; on various subtypes
    /// </summary>
    private static class CollectionHelper
    {
        private static readonly ConcurrentDictionary<Type, Func<object, int>?> _countGetters = new();

        public static int? GetCount(object? data)
        {
            if (data == null)
            {
                return null;
            }

            var type = data.GetType();
            var getter = _countGetters.GetOrAdd(type, CreateCountGetter);
            if (getter == null)
            {
                // The type does not implement ICollection<T>, so we cannot get the count
                //throw new InvalidOperationException($"Type {type.FullName} in path {path} does not implement ICollection<T>, so we can't get the count.");
                return null;
            }

            return getter.Invoke(data);
        }

        private static Func<object, int>? CreateCountGetter(Type type)
        {
            // Check if the type implements any ICollection<T>
            foreach (var @interface in type.GetInterfaces())
            {
                if (@interface.IsGenericType && @interface.GetGenericTypeDefinition() == typeof(ICollection<>))
                {
                    // Find the .Count property
                    var countProperty = @interface.GetProperty(nameof(ICollection<int>.Count));
                    if (countProperty != null && countProperty.PropertyType == typeof(int))
                    {
                        var getMethod = countProperty.GetGetMethod();
                        if (getMethod != null)
                        {
                            // Create a delegate to access .Count
                            return instance => InvokeReturnIntOrError(getMethod, instance);
                        }
                    }
                }
            }

            // Return null if not found
            return null;
        }

        private static int InvokeReturnIntOrError(MethodInfo info, object instance)
        {
            return info.Invoke(instance, null) switch
            {
                int i => i,
                _ => throw new ArgumentException("The .Count property did not return an int"),
            };
        }
    }

    /// <summary>
    /// Get a list of all possible keys for the given data model
    /// </summary>
    /// <example>
    /// intro.fnr
    /// group[0].name
    /// group[0].age
    /// group[1].name
    /// group[1].age
    /// </example>
    public static DataReference[] GetResolvedKeys(this IFormDataWrapper formDataWrapper, DataReference reference)
    {
        //TODO: write more efficient code that uses the formDataWrapper to resolve keys instead of reflection in DataModelWrapper
        var data = formDataWrapper.BackingData<object>();
#pragma warning disable CS0618 // Type or member is obsolete
        var dataModelWrapper = new DataModelWrapper(data);
#pragma warning restore CS0618 // Type or member is obsolete
        return dataModelWrapper
            .GetResolvedKeys(reference.Field)
            .Select(resolvedField => reference with { Field = resolvedField })
            .ToArray();
    }

    private static int GetMaxBufferLength(ReadOnlySpan<char> path, ReadOnlySpan<int> rowIndexes)
    {
        // assume adding indexes adds at most 10 characters per index + "[]"
        // This is way more than we likely need, but int.MaxValue has 10 digits,
        // so there is no reason to accept less.
        const int maxIntStringLength = 10 + 2;
        return path.Length + rowIndexes.Length * maxIntStringLength;
    }
}
