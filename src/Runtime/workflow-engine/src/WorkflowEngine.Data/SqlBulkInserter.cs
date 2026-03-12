using System.Linq.Expressions;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Npgsql;
using Npgsql.EntityFrameworkCore.PostgreSQL.Storage.Internal.Mapping;
using NpgsqlTypes;
using WorkflowEngine.Data.Context;

namespace WorkflowEngine.Data;

internal class SqlBulkInserter(IDbContextFactory<EngineDbContext> dbContextFactory)
{
    /// <summary>
    /// Creates a reusable bulk-insert delegate for a mapped EF Core entity type.
    /// Column order, type mappings, and value converters are resolved once from the model;
    /// the returned delegate captures no <see cref="DbContext"/>.
    /// </summary>
    public Func<NpgsqlConnection, IEnumerable<T>, CancellationToken, Task> Create<T>()
        where T : class
    {
        using var dbContext = dbContextFactory.CreateDbContext();
        var entityType =
            dbContext.Model.FindEntityType(typeof(T))
            ?? throw new InvalidOperationException($"Entity type {typeof(T).Name} not found in model.");
        var tableName = entityType.GetTableName();
        var schema = entityType.GetSchema();
        var quotedTable = schema != null ? $"\"{schema}\".\"{tableName}\"" : $"\"{tableName}\"";

        // Resolve columns once
        var columns = entityType
            .GetProperties()
            .Where(p =>
                p.PropertyInfo != null
                && !p.IsShadowProperty()
                && p.PropertyInfo.GetGetMethod() != null
                && p.ValueGenerated == ValueGenerated.Never
            )
            .Select(p =>
            {
                var typeMapping = p.GetRelationalTypeMapping();
                return new
                {
                    ColumnName = p.GetColumnName(),
                    NpgsqlDbType = (typeMapping as INpgsqlTypeMapping)?.NpgsqlDbType,
                    Getter = BuildGetter<T>(
                        p.PropertyInfo!,
                        (p.GetValueConverter() ?? typeMapping.Converter)?.ConvertToProviderExpression
                    ),
                };
            })
            .ToArray();

        // Build COPY command once
        var quotedColumns = string.Join(", ", columns.Select(c => $"\"{c.ColumnName}\""));
        var copyCommand = $"COPY {quotedTable} ({quotedColumns}) FROM STDIN (FORMAT BINARY)";

        // Return a reusable function — no DbContext captured
        return async (connection, entities, ctk) =>
        {
            await using var writer = await connection.BeginBinaryImportAsync(copyCommand, ctk);

            foreach (var entity in entities)
            {
                await writer.StartRowAsync(ctk);

                for (var i = 0; i < columns.Length; i++)
                {
                    var value = columns[i].Getter(entity);

                    if (value is null or DBNull)
                        await writer.WriteNullAsync(ctk);
                    else if (columns[i].NpgsqlDbType is { } npgsqlType)
                        await writer.WriteAsync(value, npgsqlType, ctk);
                    else
                        await writer.WriteAsync(value, ctk);
                }
            }

            await writer.CompleteAsync(ctk);
        };
    }

    /// <summary>
    /// Creates a reusable bulk-insert delegate for a two-column join table
    /// (e.g. shadow many-to-many entities that have no CLR type).
    /// Both columns are written as <see cref="NpgsqlDbType.Uuid"/>.
    /// </summary>
    public static Func<NpgsqlConnection, IEnumerable<(Guid, Guid)>, CancellationToken, Task> CreateForJoinTable(
        string tableName,
        string column1Name,
        string column2Name
    )
    {
        var copyCommand = $"COPY \"{tableName}\" (\"{column1Name}\", \"{column2Name}\") FROM STDIN (FORMAT BINARY)";

        return async (connection, rows, ctk) =>
        {
            await using var writer = await connection.BeginBinaryImportAsync(copyCommand, ctk);

            foreach (var (value1, value2) in rows)
            {
                await writer.StartRowAsync(ctk);
                await writer.WriteAsync(value1, NpgsqlDbType.Uuid, ctk);
                await writer.WriteAsync(value2, NpgsqlDbType.Uuid, ctk);
            }

            await writer.CompleteAsync(ctk);
        };
    }

    private static Func<T, object?> BuildGetter<T>(PropertyInfo propertyInfo, LambdaExpression? converterExpression)
    {
        var param = Expression.Parameter(typeof(T), "instance");
        Expression body = Expression.Property(param, propertyInfo);

        if (converterExpression != null)
        {
            var converterParam = converterExpression.Parameters[0];
            body = Expression.Invoke(converterExpression, Expression.Convert(body, converterParam.Type));
        }

        body = Expression.Convert(body, typeof(object));
        return Expression.Lambda<Func<T, object?>>(body, param).Compile();
    }
}
