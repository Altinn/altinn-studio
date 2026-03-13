namespace WorkflowEngine.Data;

internal static class TupleArrayExtensions
{
    public static (T1[], T2[]) Unzip<T1, T2>(this (T1, T2)[] source)
    {
        var a = new T1[source.Length];
        var b = new T2[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            a[i] = source[i].Item1;
            b[i] = source[i].Item2;
        }
        return (a, b);
    }

    public static (T1[], T2[], T3[]) Unzip<T1, T2, T3>(this (T1, T2, T3)[] source)
    {
        var a = new T1[source.Length];
        var b = new T2[source.Length];
        var c = new T3[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            a[i] = source[i].Item1;
            b[i] = source[i].Item2;
            c[i] = source[i].Item3;
        }
        return (a, b, c);
    }

    public static (T1[], T2[], T3[], T4[]) Unzip<T1, T2, T3, T4>(this (T1, T2, T3, T4)[] source)
    {
        var a = new T1[source.Length];
        var b = new T2[source.Length];
        var c = new T3[source.Length];
        var d = new T4[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            a[i] = source[i].Item1;
            b[i] = source[i].Item2;
            c[i] = source[i].Item3;
            d[i] = source[i].Item4;
        }
        return (a, b, c, d);
    }

    public static (T1[], T2[], T3[], T4[], T5[]) Unzip<T1, T2, T3, T4, T5>(this (T1, T2, T3, T4, T5)[] source)
    {
        var a = new T1[source.Length];
        var b = new T2[source.Length];
        var c = new T3[source.Length];
        var d = new T4[source.Length];
        var e = new T5[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            a[i] = source[i].Item1;
            b[i] = source[i].Item2;
            c[i] = source[i].Item3;
            d[i] = source[i].Item4;
            e[i] = source[i].Item5;
        }
        return (a, b, c, d, e);
    }

    public static (T1[], T2[], T3[], T4[], T5[], T6[]) Unzip<T1, T2, T3, T4, T5, T6>(
        this (T1, T2, T3, T4, T5, T6)[] source
    )
    {
        var a = new T1[source.Length];
        var b = new T2[source.Length];
        var c = new T3[source.Length];
        var d = new T4[source.Length];
        var e = new T5[source.Length];
        var f = new T6[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            a[i] = source[i].Item1;
            b[i] = source[i].Item2;
            c[i] = source[i].Item3;
            d[i] = source[i].Item4;
            e[i] = source[i].Item5;
            f[i] = source[i].Item6;
        }
        return (a, b, c, d, e, f);
    }

    public static (T1[], T2[], T3[], T4[], T5[], T6[], T7[]) Unzip<T1, T2, T3, T4, T5, T6, T7>(
        this (T1, T2, T3, T4, T5, T6, T7)[] source
    )
    {
        var a = new T1[source.Length];
        var b = new T2[source.Length];
        var c = new T3[source.Length];
        var d = new T4[source.Length];
        var e = new T5[source.Length];
        var f = new T6[source.Length];
        var g = new T7[source.Length];
        for (int i = 0; i < source.Length; i++)
        {
            a[i] = source[i].Item1;
            b[i] = source[i].Item2;
            c[i] = source[i].Item3;
            d[i] = source[i].Item4;
            e[i] = source[i].Item5;
            f[i] = source[i].Item6;
            g[i] = source[i].Item7;
        }
        return (a, b, c, d, e, f, g);
    }
}
