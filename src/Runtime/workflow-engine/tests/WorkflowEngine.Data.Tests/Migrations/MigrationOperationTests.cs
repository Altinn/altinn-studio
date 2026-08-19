using System.Reflection;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using WorkflowEngine.Data.Migrations;

namespace WorkflowEngine.Data.Tests.Migrations;

/// <summary>
/// Asserts over the migrations' operation trees rather than over a database. Both properties pinned here
/// are ones a real migration run cannot catch: the first is invisible once the migration has been
/// applied, and the second only bites the consumer that no test exercises.
/// </summary>
public class MigrationOperationTests
{
    /// <summary>
    /// Every migration in the assembly, instantiated. <see cref="Migration.UpOperations"/> builds its
    /// tree from <c>Up</c> with no provider, no model and no connection, which is what makes this a unit
    /// test.
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
        // EF appends a terminator to the operations it generates, but passes migrationBuilder.Sql(...)
        // through verbatim. That difference is invisible to the Migrator, which sends each operation as
        // its own command — and fatal to `dotnet ef migrations script`, which concatenates them into one
        // file a DBA runs through psql. An unterminated statement there merges into the next one and the
        // script dies partway, after earlier operations have already been issued.
        //
        // Pinned across every migration rather than the one that got it wrong, because the next
        // hand-written raw statement will be in a file this test has never seen.
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
        // The scaffolder produced a drop-and-recreate for this migration, because it sees one entity
        // disappear and another appear rather than one being renamed — which would take every in-flight
        // rendezvous with it. The fix was to hand-write the rename, and this is what keeps it: a future
        // regeneration that silently reverted to the scaffolded shape would restore data loss that no
        // schema assertion afterwards could detect, since the end state of both shapes is identical.
        var operations = new RenameMailboxWaitersToReceivers().UpOperations;

        Assert.Empty(operations.OfType<DropTableOperation>());
        Assert.Empty(operations.OfType<CreateTableOperation>());

        var rename = Assert.Single(operations.OfType<RenameTableOperation>());
        Assert.Equal("mailbox_waiters", rename.Name);
        Assert.Equal("mailbox_receivers", rename.NewName);
    }
}
