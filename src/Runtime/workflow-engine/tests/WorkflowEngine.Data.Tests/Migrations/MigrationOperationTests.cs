using System.Reflection;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using WorkflowEngine.Data.Migrations;

namespace WorkflowEngine.Data.Tests.Migrations;

/// <summary>
/// Asserts over the migrations' operation trees rather than over a database. Both properties pinned here are
/// ones a real migration run cannot catch: the first is invisible once the migration has been applied, and the
/// second only bites the consumer that no test exercises.
/// </summary>
public class MigrationOperationTests
{
    /// <summary>
    /// Every migration in the assembly, instantiated. <see cref="Migration.UpOperations"/> builds its tree from
    /// <c>Up</c> with no provider, model or connection, which is what makes this a unit test.
    /// </summary>
    public static TheoryData<string> AllMigrations =>
        [
            .. typeof(EngineDbContextModelSnapshot)
                .Assembly.GetTypes()
                .Where(t =>
                    typeof(Migration).IsAssignableFrom(t) && !t.IsAbstract && t.IsDefined(typeof(MigrationAttribute))
                )
                .Select(t => t.FullName!)
                .Order(StringComparer.Ordinal),
        ];

    private static Migration Instantiate(string typeName) =>
        (Migration)Activator.CreateInstance(typeof(EngineDbContextModelSnapshot).Assembly.GetType(typeName)!)!;

    [Theory]
    [MemberData(nameof(AllMigrations))]
    public void RawSqlOperations_EndWithAStatementTerminator(string migrationTypeName)
    {
        // EF appends a terminator to the operations it generates but passes migrationBuilder.Sql(...) through
        // verbatim. Invisible to the Migrator, which sends each operation as its own command, and fatal to
        // `dotnet ef migrations script`, which concatenates them into one file. Pinned across every migration
        // rather than the one that got it wrong.
        var migration = Instantiate(migrationTypeName);

        var unterminated = migration
            .UpOperations.Concat(migration.DownOperations)
            .OfType<SqlOperation>()
            .Select(op => op.Sql.TrimEnd())
            .Where(sql => !sql.EndsWith(';'))
            .ToList();

        Assert.Empty(unterminated);
    }

    [Fact]
    public void RenamingTheReceiversRegistry_IsARenameAndNotADropAndRecreate()
    {
        // The scaffolder produced a drop-and-recreate here, because it sees one entity disappear and another
        // appear rather than one being renamed — which would take every in-flight rendezvous with it. A future
        // regeneration that reverted to the scaffolded shape would restore data loss no schema assertion could
        // detect, since the end state of both shapes is identical.
        var operations = new RenameMailboxWaitersToReceivers().UpOperations;

        Assert.Empty(operations.OfType<DropTableOperation>());
        Assert.Empty(operations.OfType<CreateTableOperation>());

        var rename = Assert.Single(operations.OfType<RenameTableOperation>());
        Assert.Equal("mailbox_waiters", rename.Name);
        Assert.Equal("mailbox_receivers", rename.NewName);
    }
}
