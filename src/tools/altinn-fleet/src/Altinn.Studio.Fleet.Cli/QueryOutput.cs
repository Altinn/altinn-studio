using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>How <c>fleet query</c> writes its rows.</summary>
internal enum QueryFormat
{
    Table,
    Tsv,
    Json,
}

/// <summary>Writes the rows of a query as an aligned table, as tab-separated values or as JSON.</summary>
internal static class QueryOutput
{
    public static int Write(SqliteDataReader reader, QueryFormat format, TextWriter output)
    {
        string[] columns = [.. Enumerable.Range(0, reader.FieldCount).Select(reader.GetName)];
        return format switch
        {
            QueryFormat.Json => WriteJson(reader, columns, output),
            QueryFormat.Tsv => WriteTsv(reader, columns, output),
            _ => WriteTable(reader, columns, output),
        };
    }

    private static int WriteTable(SqliteDataReader reader, string[] columns, TextWriter output)
    {
        var rows = new List<string[]>();
        while (reader.Read())
        {
            rows.Add([.. Enumerable.Range(0, columns.Length).Select(i => Text(reader, i) ?? "NULL")]);
        }

        int[] widths = [.. columns.Select((c, i) => rows.Select(r => r[i].Length).Prepend(c.Length).Max())];
        bool[] numeric =
        [
            .. columns.Select(
                (column, i) =>
                    rows.Any(r => r[i] != "NULL")
                    && rows.All(r =>
                        r[i] == "NULL" || double.TryParse(r[i], NumberStyles.Float, CultureInfo.InvariantCulture, out _)
                    )
            ),
        ];
        string Line(string[] cells) =>
            string.Join(
                    "  ",
                    cells.Select((cell, i) => numeric[i] ? cell.PadLeft(widths[i]) : cell.PadRight(widths[i]))
                )
                .TrimEnd();

        output.WriteLine(Line(columns));
        output.WriteLine(string.Join("  ", widths.Select(w => new string('-', w))));
        foreach (string[] row in rows)
        {
            output.WriteLine(Line(row));
        }

        output.WriteLine(rows.Count == 1 ? "(1 row)" : $"({rows.Count} rows)");
        return rows.Count;
    }

    private static int WriteTsv(SqliteDataReader reader, string[] columns, TextWriter output)
    {
        output.WriteLine(string.Join('\t', columns.Select(Escape)));
        int count = 0;
        while (reader.Read())
        {
            output.WriteLine(
                string.Join('\t', Enumerable.Range(0, columns.Length).Select(i => Escape(Text(reader, i) ?? "")))
            );
            count++;
        }

        return count;
    }

    private static int WriteJson(SqliteDataReader reader, string[] columns, TextWriter output)
    {
        using var buffer = new MemoryStream();
        int count = 0;
        using (var json = new Utf8JsonWriter(buffer, new JsonWriterOptions { Indented = true }))
        {
            json.WriteStartArray();
            while (reader.Read())
            {
                json.WriteStartObject();
                for (int i = 0; i < columns.Length; i++)
                {
                    json.WritePropertyName(columns[i]);
                    switch (reader.IsDBNull(i) ? null : reader.GetValue(i))
                    {
                        case null:
                            json.WriteNullValue();
                            break;
                        case long number:
                            json.WriteNumberValue(number);
                            break;
                        case double number:
                            json.WriteNumberValue(number);
                            break;
                        case byte[] blob:
                            json.WriteStringValue(Convert.ToHexStringLower(blob));
                            break;
                        case var value:
                            json.WriteStringValue(Convert.ToString(value, CultureInfo.InvariantCulture));
                            break;
                    }
                }

                json.WriteEndObject();
                count++;
            }

            json.WriteEndArray();
        }

        output.WriteLine(Encoding.UTF8.GetString(buffer.GetBuffer(), 0, (int)buffer.Length));
        return count;
    }

    private static string? Text(SqliteDataReader reader, int ordinal) =>
        reader.IsDBNull(ordinal)
            ? null
            : reader.GetValue(ordinal) switch
            {
                byte[] blob => Convert.ToHexStringLower(blob),
                var value => Convert.ToString(value, CultureInfo.InvariantCulture),
            };

    private static string Escape(string value) =>
        value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\t", "\\t", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal)
            .Replace("\r", "\\r", StringComparison.Ordinal);
}
