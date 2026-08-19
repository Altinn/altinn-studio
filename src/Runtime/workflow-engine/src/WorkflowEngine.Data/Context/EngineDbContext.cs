using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Conventions;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Context;

internal sealed class EngineDbContext : DbContext
{
    public EngineDbContext(DbContextOptions<EngineDbContext> options)
        : base(options) { }

    public DbSet<WorkflowEntity> Workflows { get; set; }
    public DbSet<StepEntity> Steps { get; set; }
    public DbSet<IdempotencyKeyEntity> IdempotencyKeys { get; set; }

    /// <summary>
    /// Gets or sets the workflow collection entities stored in the database.
    /// </summary>
    public DbSet<WorkflowCollectionEntity> WorkflowCollections { get; set; }

    /// <summary>
    /// Gets or sets the mailbox entities stored in the database.
    /// </summary>
    public DbSet<MailboxEntity> Mailboxes { get; set; }

    /// <summary>
    /// Gets or sets the mailbox delivery entities stored in the database.
    /// </summary>
    public DbSet<MailboxDeliveryEntity> MailboxDeliveries { get; set; }

    /// <summary>
    /// Gets or sets the mailbox receiver registrations stored in the database.
    /// </summary>
    public DbSet<MailboxReceiverEntity> MailboxReceivers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema(SchemaNames.Engine);

        // Configure Workflow entity
        modelBuilder.Entity<WorkflowEntity>(entity =>
        {
            // Indexes
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.CollectionKey);
            entity.HasIndex(e => new { e.Namespace, e.Status });

            // Backs the fetch gate. Using the same constant keeps it aligned with the status set every
            // other reader consults — if the two diverge, the index stops covering the gate.
            entity
                .HasIndex(e => new { e.BackoffUntil, e.CreatedAt })
                .HasFilter($"status IN ({PersistentItemStatusMap.FetchableSqlList})")
                .HasNullSortOrder(NullSortOrder.NullsFirst, NullSortOrder.NullsLast);

            entity.HasIndex(e => e.HeartbeatAt).HasFilter($"status = {(int)PersistentItemStatus.Processing}");

            // Backs the retention candidate scan (DbMaintenanceService). Using the same constant
            // keeps it aligned with the terminal-status lists interpolated into that SQL —
            // if the sets diverge, Postgres can no longer use this partial index.
            entity.HasIndex(e => e.UpdatedAt).HasFilter($"status IN ({PersistentItemStatusMap.FinishedSqlList})");
            entity.HasIndex(e => e.Labels).HasMethod("gin");
            entity
                .Property(e => e.Labels)
                .HasConversion(
                    JsonbConverter<Dictionary<string, string>>.Converter,
                    JsonbConverter<Dictionary<string, string>>.Comparer
                );

            // Self-referencing many-to-many: a workflow can depend on many other workflows.
            // Dependents is the inverse navigation — workflows that declare this one as a dependency.
            // The join table schema is unchanged; EF resolves Dependencies vs Dependents from the FK columns.
            entity
                .HasMany(e => e.Dependencies)
                .WithMany(e => e.Dependents)
                .UsingEntity(
                    "workflow_dependency",
                    l => l.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("DependsOnWorkflowId"),
                    r => r.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("WorkflowId"),
                    j =>
                    {
                        j.HasKey("WorkflowId", "DependsOnWorkflowId");
                        j.HasIndex("DependsOnWorkflowId");
                    }
                );

            // Self-referencing many-to-many: optional links to related workflows
            entity
                .HasMany(e => e.Links)
                .WithMany()
                .UsingEntity(
                    "workflow_link",
                    l => l.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("LinkedWorkflowId"),
                    r => r.HasOne(typeof(WorkflowEntity)).WithMany().HasForeignKey("WorkflowId"),
                    j =>
                    {
                        j.HasKey("WorkflowId", "LinkedWorkflowId");
                        j.HasIndex("LinkedWorkflowId");
                    }
                );
        });

        // Configure Step entity
        modelBuilder.Entity<StepEntity>(entity =>
        {
            entity.HasIndex(e => new { e.JobId, e.Status });
            entity.HasIndex(e => e.Labels).HasMethod("gin");
            entity
                .Property(e => e.Labels)
                .HasConversion(
                    JsonbConverter<Dictionary<string, string>>.Converter,
                    JsonbConverter<Dictionary<string, string>>.Comparer
                );
            entity
                .Property(e => e.ErrorHistory)
                .HasConversion(JsonbConverter<List<ErrorEntry>>.Converter, JsonbConverter<List<ErrorEntry>>.Comparer);
        });

        // Configure IdempotencyKey entity
        modelBuilder.Entity<IdempotencyKeyEntity>(entity =>
        {
            entity.HasKey(e => new { e.IdempotencyKey, e.Namespace });
            entity.HasIndex(e => e.CreatedAt);
        });

        // Configure WorkflowCollection entity
        modelBuilder.Entity<WorkflowCollectionEntity>(entity =>
        {
            entity.HasKey(e => new { e.Key, e.Namespace });
            entity.HasIndex(e => e.Namespace);
        });

        // Configure Mailbox entity
        modelBuilder.Entity<MailboxEntity>(entity =>
        {
            entity.HasKey(e => e.Id);

            // The mint's serialization point: two concurrent mints of the same key contend on this
            // index, and exactly one of them inserts.
            entity.HasIndex(e => new { e.Namespace, e.IdempotencyKey }).IsUnique();

            // Serves both questions asked about a collection's mailboxes, which is why it is one index and
            // not two. The mint counts the collection's *open* mailboxes on every mint; the dashboard reads
            // the collection's mailboxes in *both* statuses, because under a finished collection a concluded
            // exchange is the ordinary case. `status` as the trailing key is what lets one index do both: it
            // is a perfect prefix match for the cap's three-column equality (index-only, 2 buffers) and an
            // ignorable trailing column for the dashboard's two-column range.
            //
            // Both halves were measured rather than assumed. Without the collection key indexed at all, the
            // dashboard's filter is a sequential scan of every mailbox the engine still retains — 834 buffers
            // against 40,000 rows at the design's own per-collection density, versus 3 through this index.
            // Against the alternative of keeping a separate partial `(namespace, collection_key) WHERE status
            // = 'open'` for the mint and adding a full one beside it, this shape wins on every axis: the
            // mint's count goes 4 buffers to 2, total index bytes 504 kB to 312 kB, and index entries
            // maintained per mint 2 to 1.
            //
            // One further trap, worth stating because it nearly landed: EF Core's lambda `HasIndex` keys the
            // model's index by its *property set*, so two lambda calls over the same properties do not make
            // two indexes — the second reconfigures the first, and scaffolds as a RenameIndex that keeps the
            // filter. Widening to three columns makes the property set distinct and sidesteps that entirely.
            // Pinned by MailboxDashboardTests.TheCollectionKeyIndex_CoversBothTheMintsCountAndTheDashboardsRead.
            entity
                .HasIndex(e => new
                {
                    e.Namespace,
                    e.CollectionKey,
                    e.Status,
                })
                .HasDatabaseName("ix_mailboxes_namespace_collection_key");

            // The deadline sweep's candidate scan, which runs on every cadence whether or not anything is
            // overdue — so what it costs when nothing is is the cost that matters. Partial on 'open' and
            // ordered by deadline, the sweep's own predicate and ordering: a tick with nothing overdue
            // reads the leading index entry, finds a deadline in the future, and stops.
            entity
                .HasIndex(e => e.Deadline)
                .HasDatabaseName("ix_mailboxes_deadline_open")
                .HasFilter($"status = '{MailboxStatusMap.Open}'");

            // The retention purge's candidate scan, the mirror image: partial on 'disposed' because a
            // mailbox is only purgeable once it is closed, and keyed by the instant it closed.
            entity
                .HasIndex(e => e.DisposedAt)
                .HasDatabaseName("ix_mailboxes_disposed_at")
                .HasFilter($"status = '{MailboxStatusMap.Disposed}'");

            entity.Property(e => e.NextIdx).HasDefaultValue(0L);
            entity.Property(e => e.NextSeq).HasDefaultValue(0L);

            entity
                .Property(e => e.Status)
                .HasColumnType("text")
                .HasConversion(v => MailboxStatusMap.ToDbValue(v), v => MailboxStatusMap.FromDbValue(v))
                .HasDefaultValue(MailboxStatus.Open);

            entity
                .Property(e => e.DisposedReason)
                .HasColumnType("text")
                .HasConversion(
                    v => v == null ? null : MailboxStatusMap.ToDbValue(v.Value),
                    v => v == null ? null : MailboxStatusMap.ReasonFromDbValue(v)
                );

            entity.ToTable(table =>
            {
                table.HasCheckConstraint(
                    "ck_mailboxes_status",
                    $"status IN ('{MailboxStatusMap.Open}', '{MailboxStatusMap.Disposed}')"
                );
                table.HasCheckConstraint(
                    "ck_mailboxes_disposed_reason",
                    $"disposed_reason IN ('{MailboxStatusMap.ReasonRequest}', '{MailboxStatusMap.ReasonDeadline}')"
                );

                // The disposal fields are set together with the status or not at all, which is what makes
                // "disposedReason is null exactly while the mailbox is open" a property of the schema
                // rather than only of the code path that happens to write it.
                table.HasCheckConstraint(
                    "ck_mailboxes_disposal_is_complete",
                    $"(status = '{MailboxStatusMap.Open}' AND disposed_reason IS NULL AND disposed_at IS NULL) "
                        + $"OR (status = '{MailboxStatusMap.Disposed}' AND disposed_reason IS NOT NULL AND disposed_at IS NOT NULL)"
                );
            });
        });

        // Configure MailboxDelivery entity
        modelBuilder.Entity<MailboxDeliveryEntity>(entity =>
        {
            // The position is the address: this is the key the receiving workflow reads its delivery by,
            // so it is the primary key rather than a surrogate id with an index beside it.
            entity.HasKey(e => new { e.MailboxId, e.Idx });

            // What makes an at-least-once forwarder's resend idempotent. Ingestion holds the mailbox row
            // lock while it looks a key up and appends, so this index is the schema's guarantee rather
            // than the mechanism the happy path relies on — it is what would catch a future writer that
            // appended without taking the lock.
            entity.HasIndex(e => new { e.MailboxId, e.IdempotencyKey }).IsUnique();

            // No cascade: a mailbox with deliveries cannot be deleted out from under them. Retention
            // purges children first, deliberately and in that order, so an accidental delete of a mailbox
            // fails loudly instead of silently taking the exchange's messages with it.
            entity
                .HasOne<MailboxEntity>()
                .WithMany()
                .HasForeignKey(e => e.MailboxId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure MailboxReceiver entity
        modelBuilder.Entity<MailboxReceiverEntity>(entity =>
        {
            // The wake's key: a delivery landing at a position asks who, if anyone, is waiting there.
            entity.HasKey(e => new { e.MailboxId, e.Seq });

            // The executor's key, and the schema's statement that one receive workflow consumes exactly
            // one position. Total rather than partial, now that every receiver registers: a second
            // registration for the same workflow is a bug in the enqueue plan, and this is what makes it
            // fail loudly instead of silently double-consuming the log.
            entity.HasIndex(e => e.WorkflowId).IsUnique();

            // No cascade, matching mailbox_deliveries: retention purges a mailbox's children first,
            // explicitly and in that order, so an accidental delete of a mailbox fails loudly (SQLSTATE
            // 23001) instead of silently taking the rendezvous with it.
            entity
                .HasOne<MailboxEntity>()
                .WithMany()
                .HasForeignKey(e => e.MailboxId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(table =>
                // Every receiver is born having done exactly one of two things: parked, or become runnable
                // immediately. So one of the two stamps is always set at insert, and a row with neither
                // describes a receiver in no state at all — unregistered as far as the wake and the closure
                // release are concerned, since both filter on `released_at IS NULL` and would treat it as
                // parked forever, while `held_at IS NULL` would exclude it from the wake histogram. The
                // invariant lived in doc comments until now; as a constraint it fails at insert instead.
                table.HasCheckConstraint(
                    "ck_mailbox_receivers_birth_is_recorded",
                    "held_at IS NOT NULL OR released_at IS NOT NULL"
                )
            );
        });

        SnakeCaseNamingConvention.Apply(modelBuilder);
    }

    /// <summary>
    /// Generic EF Core value converter + comparer for <c>T? ↔ jsonb</c>.
    /// The converter is needed because our <see cref="SqlBulkInserter"/> uses COPY BINARY
    /// (Npgsql handles jsonb natively for normal EF queries). The comparer enables correct
    /// change tracking and silences EF warning 10620.
    /// </summary>
    private static class JsonbConverter<T>
        where T : class
    {
        // EF expression trees don't support throw expressions; value is never null (serialized by us)
#pragma warning disable NX0003
        public static readonly ValueConverter<T?, string> Converter = new(
            v => JsonSerializer.Serialize(v, JsonOptions.Default),
            v => JsonSerializer.Deserialize<T>(v, JsonOptions.Default)!
        );
#pragma warning restore NX0003

        public static readonly ValueComparer<T?> Comparer = new(
            equalsExpression: (a, b) => Serialize(a) == Serialize(b),
            hashCodeExpression: v => Serialize(v).GetHashCode(),
            snapshotExpression: v => v == null ? null : JsonSerializer.Deserialize<T>(Serialize(v), JsonOptions.Default)
        );

        private static string Serialize(T? value) => JsonSerializer.Serialize(value, JsonOptions.Default);
    }
}
