using Altinn.Studio.Common.Domain;
using Altinn.Studio.Fleet.Store;
using Microsoft.Data.Sqlite;

namespace Altinn.Studio.Fleet.Cli;

/// <summary><c>fleet query</c>.</summary>
internal static class QueryCommand
{
    public static int Run(Arguments args, FleetStore store, string sql, TextWriter output)
    {
        string? database = args.Value("db");
        string? env = args.Value("env");
        if (database is not null && env is not null)
        {
            throw new UsageException("Give --db or --env, not both. --db attaches every environment's index.");
        }

        List<RuntimeEnvironment> environments = Cli.Environments(env ?? "prod");
        if (environments.Count != 1)
        {
            throw new UsageException("query reads one environment's index; give --env prod or --env tt02.");
        }

        QueryFormat format = (args.Flag("json"), args.Flag("tsv")) switch
        {
            (true, true) => throw new UsageException("Give --json or --tsv, not both."),
            (true, _) => QueryFormat.Json,
            (_, true) => QueryFormat.Tsv,
            _ => QueryFormat.Table,
        };
        args.RejectUnused();

        using SqliteConnection connection = database is null
            ? FleetStoreReader.OpenForQueries(store, environments[0])
            : FleetStoreReader.OpenFileForQueries(store, database);
        using SqliteCommand command = connection.CreateCommand();
        command.CommandText = sql;
        using SqliteDataReader reader = command.ExecuteReader();
        QueryOutput.Write(reader, format, output);
        return 0;
    }
}
