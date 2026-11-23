using System;
using System.Collections;
using System.Collections.Generic;
using System.Runtime.CompilerServices;

namespace Altinn.Studio.Common.Domain;

/// <summary>
/// A list that cannot change, and that equals another with equal items in the same order.
/// </summary>
/// <remarks>
/// A record compares a list it holds by reference, so two records with the same content would differ. The records of
/// this model hold their lists as this type and so compare by value all the way down. Create one with a collection
/// expression, such as <c>[first, second]</c> or <c>[.. items]</c>. Its default value is the empty list.
/// </remarks>
/// <typeparam name="T">The type of the items.</typeparam>
[CollectionBuilder(typeof(ValueList), nameof(ValueList.Create))]
public readonly struct ValueList<T> : IReadOnlyList<T>, IEquatable<ValueList<T>>
{
    private readonly T[]? _items;

    // Takes the array as its own, so the caller must not keep it.
    internal ValueList(T[] items)
    {
        _items = items;
    }

    private T[] Items => _items ?? [];

    /// <inheritdoc />
    public int Count => Items.Length;

    /// <inheritdoc />
    public T this[int index] => Items[index];

    /// <summary>Whether two lists have equal items in the same order.</summary>
    public static bool operator ==(ValueList<T> left, ValueList<T> right) => left.Equals(right);

    /// <summary>Whether two lists differ in an item or in their order.</summary>
    public static bool operator !=(ValueList<T> left, ValueList<T> right) => !left.Equals(right);

    /// <inheritdoc />
    public bool Equals(ValueList<T> other)
    {
        T[] items = Items;
        T[] otherItems = other.Items;
        if (items.Length != otherItems.Length)
        {
            return false;
        }

        EqualityComparer<T> comparer = EqualityComparer<T>.Default;
        for (int i = 0; i < items.Length; i++)
        {
            if (!comparer.Equals(items[i], otherItems[i]))
            {
                return false;
            }
        }

        return true;
    }

    /// <inheritdoc />
    public override bool Equals(object? obj) => obj is ValueList<T> other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode()
    {
        // System.HashCode is not in netstandard2.0.
        EqualityComparer<T> comparer = EqualityComparer<T>.Default;
        int hash = 17;
        foreach (T item in Items)
        {
            hash = unchecked((hash * 31) + (item is null ? 0 : comparer.GetHashCode(item)));
        }

        return hash;
    }

    /// <inheritdoc />
    public IEnumerator<T> GetEnumerator() => ((IEnumerable<T>)Items).GetEnumerator();

    /// <inheritdoc />
    IEnumerator IEnumerable.GetEnumerator() => Items.GetEnumerator();

    /// <summary>Returns the items between brackets, such as <c>[net8.0, net9.0]</c>.</summary>
    public override string ToString() => $"[{string.Join(", ", Items)}]";
}

/// <summary>Creates a <see cref="ValueList{T}"/>, which a collection expression does through this.</summary>
public static class ValueList
{
    /// <summary>Creates a list with a copy of the items.</summary>
    public static ValueList<T> Create<T>(ReadOnlySpan<T> items) => new(items.ToArray());
}
