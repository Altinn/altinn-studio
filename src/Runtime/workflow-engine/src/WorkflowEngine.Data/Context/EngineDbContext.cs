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

    public DbSet<MailboxEntity> Mailboxes { get; set; }

    public DbSet<MailboxDeliveryEntity> MailboxDeliveries { get; set; }

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

            // Backs the fetch gate. Using the same constant keeps it aligned with the status set every other reader
            // consults.
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

            // The mint's serialization point: two concurrent mints of the same key contend on this index.
            entity.HasIndex(e => new { e.Namespace, e.IdempotencyKey }).IsUnique();

            // Serves both questions asked about a collection's mailboxes, which is why it is one index and not two.
            // The mint counts the collection's *open* mailboxes; the dashboard reads both statuses. `status` as the
            // trailing key is what lets one index do both — a perfect prefix match for the cap's three-column
            // equality (index-only, 2 buffers) and an ignorable trailing column for the dashboard's range.
            //

            // Note that EF Core's lambda `HasIndex` keys the model's index by its property set, so two lambda calls
            // over the same properties reconfigure one index rather than making two — and scaffold as a RenameIndex
            // that keeps the filter. Widening to three columns makes the property set distinct.
            // Pinned by MailboxDashboardTests.TheCollectionKeyIndex_CoversBothTheMintsCountAndTheDashboardsRead.
            entity
                .HasIndex(e => new
                {
                    e.Namespace,
                    e.CollectionKey,
                    e.Status,
                })
                .HasDatabaseName("ix_mailboxes_namespace_collection_key");

            // The deadline sweep's candidate scan, which runs on every cadence whether or not anything is overdue.
            // Partial on 'open' and ordered by deadline, the sweep's own predicate and ordering, so a quiet tick
            // reads the leading index entry and stops.
            entity
                .HasIndex(e => e.Deadline)
                .HasDatabaseName("ix_mailboxes_deadline_open")
                .HasFilter($"status = '{MailboxStatusMap.Open}'");

            // The retention purge's candidate scan, the mirror image: partial on 'disposed' because a mailbox is only
            // purgeable once closed, and keyed by the instant it closed.
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
                // "disposedReason is null exactly while the mailbox is open" a property of the schema.
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
            // The position is the address the receiving workflow reads its delivery by, so it is the primary key
            // rather than a surrogate id with an index beside it.
            entity.HasKey(e => new { e.MailboxId, e.Idx });

            // What makes an at-least-once forwarder's resend idempotent. Ingestion holds the mailbox row lock across
            // the lookup and the append, so this index is the schema's guarantee against a future writer that
            // appends without taking it.
            entity.HasIndex(e => new { e.MailboxId, e.IdempotencyKey }).IsUnique();

            // No cascade: retention purges children first, deliberately, so an accidental delete of a mailbox fails
            // loudly instead of silently taking the exchange's messages with it.
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

            // The executor's key, and the schema's statement that one receive workflow consumes exactly one position.
            // Total rather than partial now that every receiver registers, so a second registration for the same
            // workflow fails loudly instead of silently double-consuming the log.
            entity.HasIndex(e => e.WorkflowId).IsUnique();

            // No cascade, matching mailbox_deliveries: an accidental delete of a mailbox fails loudly (SQLSTATE
            // 23001) instead of silently taking the rendezvous with it.
            entity
                .HasOne<MailboxEntity>()
                .WithMany()
                .HasForeignKey(e => e.MailboxId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(table =>
                // Every receiver is born having done exactly one of two things, so one of the two stamps is
                // always set at insert. A row with neither describes a receiver in no state at all: both filter on
                // `released_at IS NULL` and would treat it as parked forever.
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
