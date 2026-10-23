namespace Altinn.Studio.Designer.Telemetry;

internal static partial class ServiceTelemetry
{
    /// <summary>
    /// The names of the attributes Designer puts on its telemetry: the OpenTelemetry semantic conventions it sets
    /// itself, the shared Altinn vocabulary, and Designer's own under altinn.designer
    /// (https://github.com/Altinn/altinn-studio/issues/21073).
    /// </summary>
    public static class Attributes
    {
        public const string ServiceVersion = "service.version";
        public const string ServiceInstanceId = "service.instance.id";
        public const string UrlFull = "url.full";
        public const string EndUserId = "enduser.id";
        public const string ErrorType = "error.type";

        public const string ServiceOwner = "altinn.service_owner";
        public const string App = "altinn.app";
        public const string RepoType = "altinn.repo_type";

        /// <summary>
        /// The runtime environment an operation targets, such as tt02 for a deploy. Never a Studio environment:
        /// where Designer itself runs is the resource's deployment.environment.name.
        /// </summary>
        public const string Environment = "altinn.environment";

        /// <summary>
        /// Marks a span whose trace the collectors' tail sampling always keeps.
        /// </summary>
        public const string Sampling = "altinn.studio.sampling";

        public static class AppActivity
        {
            private const string Prefix = "altinn.designer.app_activity.";

            public const string CollectionSkipReason = Prefix + "collection_skip_reason";
            public const string DeployedAppCount = Prefix + "deployed_app_count";
            public const string DeployedAppWithReadCount = Prefix + "deployed_app_with_read_count";
            public const string DeployedAppWithWriteCount = Prefix + "deployed_app_with_write_count";
            public const string DeployedAppWithoutSignalCount = Prefix + "deployed_app_without_signal_count";
            public const string EnvironmentCollectedCount = Prefix + "environment_collected_count";
            public const string EnvironmentFailedCount = Prefix + "environment_failed_count";
            public const string EnvironmentSkippedCount = Prefix + "environment_skipped_count";
            public const string ServiceOwnerCount = Prefix + "service_owner_count";
            public const string ServiceOwnerFailedCount = Prefix + "service_owner_failed_count";
            public const string TimedOut = Prefix + "timed_out";
            public const string TimeoutSeconds = Prefix + "timeout_seconds";
            public const string UndeployedAppWithSignalCount = Prefix + "undeployed_app_with_signal_count";
            public const string WindowDays = Prefix + "window_days";
        }

        public static class ChatCleanup
        {
            private const string Prefix = "altinn.designer.chat_cleanup.";

            public const string RetentionDays = Prefix + "retention_days";
            public const string ThreadsDeleted = Prefix + "threads_deleted";
        }

        /// <summary>
        /// An exception that Designer turned into an expected response, such as a 4xx, rather than a server error.
        /// </summary>
        public static class Error
        {
            private const string Prefix = "altinn.designer.error.";

            public const string Code = Prefix + "code";
            public const string ExceptionType = Prefix + "exception_type";
        }

        public static class Git
        {
            private const string Prefix = "altinn.designer.git.";

            public const string AheadBy = Prefix + "ahead_by";
            public const string BehindBy = Prefix + "behind_by";
            public const string Branch = Prefix + "branch";
            public const string BranchDeleted = Prefix + "branch_deleted";
            public const string BranchSupplied = Prefix + "branch_supplied";
            public const string CheckoutBlocked = Prefix + "checkout.blocked";
            public const string CloneCloned = Prefix + "clone.cloned";
            public const string CloneFailureHandled = Prefix + "clone.failure_handled";
            public const string CloneRepoExisted = Prefix + "clone.repo_existed";
            public const string CommitCreated = Prefix + "commit.created";
            public const string CommitIsDirty = Prefix + "commit.is_dirty";
            public const string CommitMessageEmpty = Prefix + "commit.message_empty";
            public const string CommitPushTarget = Prefix + "commit.push_target";
            public const string CommitSha = Prefix + "commit.sha";
            public const string ContentStatusCount = Prefix + "content_status_count";
            public const string FeatureBranch = Prefix + "feature_branch";
            public const string FilePath = Prefix + "file.path";
            public const string FileStaged = Prefix + "file.staged";
            public const string IsDirty = Prefix + "is_dirty";
            public const string PullCheckoutConflict = Prefix + "pull.checkout_conflict";
            public const string PullConflictCountBefore = Prefix + "pull.conflict_count_before";
            public const string PullHeadBranchAfter = Prefix + "pull.head_branch_after";
            public const string PullHeadBranchBefore = Prefix + "pull.head_branch_before";
            public const string PullIsDirtyBefore = Prefix + "pull.is_dirty_before";
            public const string PullMergeConflict = Prefix + "pull.merge_conflict";
            public const string PullMergeConflictCount = Prefix + "pull.merge_conflict_count";
            public const string PullMergeStatus = Prefix + "pull.merge_status";
            public const string PushCompleted = Prefix + "push.completed";
            public const string PushErrorCount = Prefix + "push.error_count";
            public const string PushErrorMessages = Prefix + "push.error_messages";
            public const string PushErrorReferences = Prefix + "push.error_references";
            public const string PushRemote = Prefix + "push.remote";
            public const string PushRemoteUrlUpdated = Prefix + "push.remote_url_updated";
            public const string PushSuccess = Prefix + "push.success";
            public const string RebaseConflictsAborted = Prefix + "rebase.conflicts_aborted";
            public const string RebaseStatus = Prefix + "rebase.status";
            public const string RebaseStopAborted = Prefix + "rebase.stop_aborted";

            /// <summary>
            /// The Gitea repository a git operation works on, as {owner}/{repository}. It isn't always the request's
            /// app: GitOps operations work on {org}-gitops in the GitOps organization.
            /// </summary>
            public const string Repository = Prefix + "repository";
            public const string RepositoryStatus = Prefix + "repository_status";
            public const string SourceBranch = Prefix + "source_branch";
            public const string TargetBranch = Prefix + "target_branch";
        }

        public static class InactivityUndeploy
        {
            private const string Prefix = "altinn.designer.inactivity_undeploy.";

            public const string ActiveAppCount = Prefix + "active_app_count";

            /// <summary>
            /// The candidates as {environment}/{app}, at most the first 100.
            /// </summary>
            public const string CandidateApps = Prefix + "candidate_apps";
            public const string CandidateCount = Prefix + "candidate_count";
            public const string CapReached = Prefix + "cap_reached";
            public const string CapSkippedCount = Prefix + "cap_skipped_count";
            public const string DeployedAppCount = Prefix + "deployed_app_count";
            public const string DisabledAppCount = Prefix + "disabled_app_count";
            public const string DryRun = Prefix + "dry_run";
            public const string EnvironmentFilter = Prefix + "environment_filter";
            public const string EvaluationSkipReason = Prefix + "evaluation_skip_reason";
            public const string Index = Prefix + "index";
            public const string MaxUndeploysPerDay = Prefix + "max_undeploys_per_day";
            public const string NotFreshAppCount = Prefix + "not_fresh_app_count";
            public const string NotFullyObservedAppCount = Prefix + "not_fully_observed_app_count";
            public const string OrgCount = Prefix + "org_count";
            public const string PendingUndeployJobCount = Prefix + "pending_undeploy_job_count";
            public const string QueueReason = Prefix + "queue_reason";
            public const string Queued = Prefix + "queued";
            public const string QueuedCount = Prefix + "queued_count";
            public const string RecentUndeployCount = Prefix + "recent_undeploy_count";
            public const string RecentlyDeployedAppCount = Prefix + "recently_deployed_app_count";
            public const string TimedOut = Prefix + "timed_out";
            public const string TimeoutSeconds = Prefix + "timeout_seconds";
        }

        public static class Notification
        {
            private const string Prefix = "altinn.designer.notification.";

            public const string ContactMethodType = Prefix + "contact_method.type";
            public const string ContactPointId = Prefix + "contact_point.id";
            public const string DeliveryCount = Prefix + "delivery_count";
            public const string DeliveryFailedCount = Prefix + "delivery_failed_count";
            public const string Title = Prefix + "title";
        }

        public static class Oidc
        {
            private const string Prefix = "altinn.designer.oidc.";

            public const string Authority = Prefix + "authority";
            public const string NewExpiresAt = Prefix + "new_expires_at";
            public const string NewRefreshTokenIssued = Prefix + "new_refresh_token_issued";
            public const string PreviousExpiresAt = Prefix + "previous_expires_at";
            public const string RefreshStatusCode = Prefix + "refresh_status_code";
            public const string TokenEndpoint = Prefix + "token_endpoint";
        }

        public static class PeriodicReport
        {
            private const string Prefix = "altinn.designer.periodic_report.";

            public const string FailedCount = Prefix + "failed_count";
            public const string Frequency = Prefix + "frequency";
            public const string TargetCount = Prefix + "target_count";
        }

        public static class Release
        {
            private const string Prefix = "altinn.designer.release.";

            public const string MaskinportenAppCsprojDecodeFailed = Prefix + "maskinporten.app_csproj_decode_failed";
            public const string MaskinportenAppCsprojFetchFailed = Prefix + "maskinporten.app_csproj_fetch_failed";
            public const string MaskinportenDefaultScopesAdded = Prefix + "maskinporten.default_scopes_added";
            public const string MaskinportenDefaultScopesPresent = Prefix + "maskinporten.default_scopes_present";
            public const string TargetCommitish = Prefix + "target_commitish";
        }

        public static class RepositoryCleanup
        {
            private const string Prefix = "altinn.designer.repository_cleanup.";

            public const string BatchMaximum = Prefix + "batch_maximum";
            public const string Candidates = Prefix + "candidates";
            public const string Deleted = Prefix + "deleted";
            public const string Failed = Prefix + "failed";
            public const string RetentionDays = Prefix + "retention_days";
            public const string Skipped = Prefix + "skipped";
            public const string TimeoutMinutes = Prefix + "timeout_minutes";
        }

        public static class ResourceRegistry
        {
            private const string Prefix = "altinn.designer.resource_registry.";

            public const string PublishResult = Prefix + "publish.result";
            public const string PublishStatusCode = Prefix + "publish.status_code";
            public const string PublishValidationErrors = Prefix + "publish.validation_errors";
        }

        public static class SignalR
        {
            private const string Prefix = "altinn.designer.signalr.";

            public const string ConnectionId = Prefix + "connection_id";
        }

        public static class Studioctl
        {
            private const string Prefix = "altinn.designer.studioctl.";

            public const string GithubRateLimited = Prefix + "github.rate_limited";
            public const string GithubReleaseLookupPage = Prefix + "github.release_lookup_page";
            public const string GithubResponseStatusCode = Prefix + "github.response_status_code";
            public const string InstallScriptType = Prefix + "install_script.type";
            public const string ReleaseDiscoveryStatus = Prefix + "release.discovery_status";
            public const string ReleaseFallback = Prefix + "release.fallback";
            public const string ReleaseTag = Prefix + "release.tag";
        }

        public static class Undeploy
        {
            private const string Prefix = "altinn.designer.undeploy.";

            public const string BuildId = Prefix + "build.id";
            public const string PendingAgeSeconds = Prefix + "pending_age_seconds";
            public const string PendingSkipThresholdSeconds = Prefix + "pending_skip_threshold_seconds";
            public const string SkipReason = Prefix + "skip_reason";
            public const string StalePendingDecommissionIgnored = Prefix + "stale_pending_decommission_ignored";
        }
    }
}
