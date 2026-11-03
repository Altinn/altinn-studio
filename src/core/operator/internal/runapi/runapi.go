// Package runapi serves the run API in api/openapi.yaml. It turns HTTP into calls to the runs service and its errors
// into problem details.
package runapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strconv"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/core-operator/internal/auth"
	"altinn.studio/core-operator/internal/config"
	"altinn.studio/core-operator/internal/problem"
	"altinn.studio/core-operator/internal/runs"
)

const (
	// maxCreateBytes holds the largest create the contract allows: 16 arguments of 1024 characters, also when the
	// client escapes each character as a surrogate pair of 12 bytes, and the source.
	maxCreateBytes = 256 << 10
	// retryAfterSeconds is the Retry-After of a 503: the engine and the job host are usually back within seconds.
	retryAfterSeconds = "5"
)

type API struct {
	service *runs.Service
}

func New(service *runs.Service) *API {
	return &API{service: service}
}

// Handler routes the run API. The caller must already be in the request context, as auth.RequireCaller puts it.
func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/kinds", a.listKinds)
	mux.HandleFunc("GET /api/v1/runs", a.findRuns)
	mux.HandleFunc("POST /api/v1/runs", a.createRun)
	mux.HandleFunc("GET /api/v1/runs/{runId}", a.getRun)
	mux.HandleFunc("PUT /api/v1/runs/{runId}/archive", a.uploadArchive)
	mux.HandleFunc("GET /api/v1/runs/{runId}/result", a.getResult)
	mux.HandleFunc("POST /api/v1/runs/{runId}/cancel", a.cancelRun)
	return mux
}

func (a *API) listKinds(w http.ResponseWriter, r *http.Request) {
	problem.WriteJSON(w, r, http.StatusOK, map[string]any{"kinds": a.service.Kinds(auth.CallerFrom(r.Context()))})
}

func (a *API) findRuns(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	filter := runs.Filter{
		Source: runs.Source{
			Org:       query.Get("org"),
			App:       query.Get("app"),
			RepoOwner: query.Get("repoOwner"),
			Repo:      query.Get("repo"),
			Commit:    query.Get("commit"),
		},
		Kind: query.Get("kind"),
	}
	if filter.Kind != "" && !config.ValidName(filter.Kind) {
		problem.Write(w, r, http.StatusBadRequest,
			fmt.Sprintf("kind must be a lowercase name of at most %d characters.", config.MaxNameLength))
		return
	}
	found, err := a.service.Find(r.Context(), auth.CallerFrom(r.Context()), filter)
	if err != nil {
		writeError(w, r, err)
		return
	}
	problem.WriteJSON(w, r, http.StatusOK, map[string]any{"runs": found})
}

func (a *API) createRun(w http.ResponseWriter, r *http.Request) {
	if !hasMediaType(r, "application/json") {
		problem.Write(w, r, http.StatusUnsupportedMediaType, "Send the run as application/json.")
		return
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCreateBytes))
	decoder.DisallowUnknownFields()
	var request runs.CreateRequest
	if err := decoder.Decode(&request); err != nil {
		problem.Write(w, r, http.StatusBadRequest, "The body is not a CreateRun object: "+err.Error())
		return
	}
	if !config.ValidName(request.Kind) {
		problem.Write(w, r, http.StatusBadRequest,
			fmt.Sprintf("kind must be a lowercase name of at most %d characters.", config.MaxNameLength))
		return
	}

	run, created, err := a.service.Create(r.Context(), auth.CallerFrom(r.Context()), request)
	if err != nil {
		writeError(w, r, err)
		return
	}
	status := http.StatusOK
	if created {
		status = http.StatusAccepted
	}
	problem.WriteJSON(w, r, status, run)
}

func (a *API) getRun(w http.ResponseWriter, r *http.Request) {
	wait := time.Duration(0)
	if text := r.URL.Query().Get("wait"); text != "" {
		seconds, err := strconv.Atoi(text)
		if err != nil || seconds < 0 {
			problem.Write(w, r, http.StatusBadRequest, "wait must be a whole number of seconds from 0 to 30.")
			return
		}
		wait = min(time.Duration(seconds)*time.Second, runs.MaxWait)
	}
	run, err := a.service.Get(r.Context(), auth.CallerFrom(r.Context()), r.PathValue("runId"), wait)
	if err != nil {
		writeError(w, r, err)
		return
	}
	problem.WriteJSON(w, r, http.StatusOK, run)
}

// uploadArchive passes the archive on to the run's job host as it arrives, so the operator never holds it.
func (a *API) uploadArchive(w http.ResponseWriter, r *http.Request) {
	if !hasMediaType(r, "application/gzip") {
		problem.Write(w, r, http.StatusUnsupportedMediaType, "Send the archive as application/gzip.")
		return
	}
	if r.ContentLength > runs.MaxArchiveBytes {
		problem.Write(w, r, http.StatusRequestEntityTooLarge, tooLarge)
		return
	}
	body := http.MaxBytesReader(w, r.Body, runs.MaxArchiveBytes)
	run, err := a.service.Upload(r.Context(), auth.CallerFrom(r.Context()), r.PathValue("runId"), body, r.ContentLength)
	if _, tooMuch := errors.AsType[*http.MaxBytesError](err); tooMuch {
		problem.Write(w, r, http.StatusRequestEntityTooLarge, tooLarge)
		return
	}
	if err != nil {
		writeError(w, r, err)
		return
	}
	problem.WriteJSON(w, r, http.StatusAccepted, run)
}

var tooLarge = fmt.Sprintf("The archive is larger than %d MiB.", runs.MaxArchiveBytes>>20)

// getResult passes the result on from the run's job host, so a result of tens of MiB is not held in memory.
func (a *API) getResult(w http.ResponseWriter, r *http.Request) {
	result, size, err := a.service.Result(r.Context(), auth.CallerFrom(r.Context()), r.PathValue("runId"))
	if err != nil {
		writeError(w, r, err)
		return
	}
	logger := log.FromContext(r.Context())
	defer func() {
		if err := result.Close(); err != nil {
			logger.V(1).Info("Close result failed", "error", err.Error())
		}
	}()
	w.Header().Set("Content-Type", "application/json")
	if size >= 0 {
		w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	}
	w.WriteHeader(http.StatusOK)
	if _, err := io.Copy(w, result); err != nil {
		// The status line is out, so only the log can tell. It is usually a client that went away, which can fetch
		// the result again within the job host's grace.
		logger.V(1).Info("Write result failed", "path", r.URL.Path, "error", err.Error())
	}
}

func (a *API) cancelRun(w http.ResponseWriter, r *http.Request) {
	run, canceled, err := a.service.Cancel(r.Context(), auth.CallerFrom(r.Context()), r.PathValue("runId"))
	if err != nil {
		writeError(w, r, err)
		return
	}
	status := http.StatusOK
	if canceled {
		status = http.StatusAccepted
	}
	problem.WriteJSON(w, r, status, run)
}

// hasMediaType reports whether the request's content type is mediaType, in any case and with any parameters.
func hasMediaType(r *http.Request, mediaType string) bool {
	parsed, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	return err == nil && parsed == mediaType
}

// statusOf maps the runs service's errors to the statuses in api/openapi.yaml, with a detail for the caller.
func statusOf(err error) (int, string) {
	var invalid *runs.RequestError
	var upload *runs.UploadError
	switch {
	case errors.As(err, &invalid):
		return http.StatusBadRequest, invalid.Message
	case errors.As(err, &upload):
		return uploadStatus(upload)
	case errors.Is(err, runs.ErrKindNotFound):
		return http.StatusNotFound, "This environment has no such kind."
	case errors.Is(err, runs.ErrKindForbidden):
		return http.StatusForbidden, "The caller may not run this kind."
	case errors.Is(err, runs.ErrNotFound):
		return http.StatusNotFound, "The caller has no such run."
	case errors.Is(err, runs.ErrQueueFull):
		return http.StatusTooManyRequests, "The caller has as many queued runs as the kind allows."
	case errors.Is(err, runs.ErrConflict):
		return http.StatusConflict, "The caller has a run of this kind for this source in progress, with other arguments."
	case errors.Is(err, runs.ErrNotAwaiting):
		return http.StatusConflict, "The run does not await its archive: " + err.Error() + "."
	case errors.Is(err, runs.ErrNotFinished):
		return http.StatusConflict, "The run has not finished."
	case errors.Is(err, runs.ErrNoResult):
		return http.StatusConflict, err.Error() + "."
	case errors.Is(err, runs.ErrExpired):
		return http.StatusGone, "The result has expired, and the run's Job is gone. A new run gives the result again."
	case errors.Is(err, runs.ErrUnavailable):
		return http.StatusServiceUnavailable, "The operator cannot reach its engine. Try again."
	case errors.Is(err, runs.ErrJobHost):
		return http.StatusServiceUnavailable, "The operator cannot reach the run's Job. Try again."
	default:
		return http.StatusInternalServerError, ""
	}
}

// uploadStatus passes on the job host's refusal of an archive. Each is a problem with the archive, which the caller
// must fix, except one that the operator caused.
func uploadStatus(upload *runs.UploadError) (int, string) {
	switch upload.Status {
	case http.StatusBadRequest, http.StatusRequestEntityTooLarge, http.StatusUnsupportedMediaType:
		return upload.Status, upload.Detail
	default:
		return http.StatusInternalServerError, ""
	}
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	status, detail := statusOf(err)
	switch status {
	case http.StatusServiceUnavailable:
		log.FromContext(r.Context()).Info("A dependency did not answer", "error", err.Error())
		w.Header().Set("Retry-After", retryAfterSeconds)
	case http.StatusInternalServerError:
		log.FromContext(r.Context()).Error(err, "Run API request failed", "path", r.URL.Path)
	}
	problem.Write(w, r, status, detail)
}
