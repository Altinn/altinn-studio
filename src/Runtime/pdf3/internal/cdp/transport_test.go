package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"testing"
	"time"
)

//nolint:ireturn // Tests exercise the public Connection interface.
func connectTestPipe(t *testing.T, ctx context.Context, handler EventHandler) (Connection, *pipeTransport) {
	t.Helper()
	commandReader, commandWriter := io.Pipe()
	responseReader, responseWriter := io.Pipe()
	conn, err := ConnectPipe(ctx, 0, responseReader, commandWriter, handler)
	if err != nil {
		t.Fatal(err)
	}
	peer := newPipeTransport(commandReader, responseWriter)
	t.Cleanup(func() {
		if closeErr := conn.Close(); closeErr != nil {
			t.Error(closeErr)
		}
		if closeErr := peer.Close(); closeErr != nil {
			t.Error(closeErr)
		}
	})
	return conn, peer
}

func receiveTestCommand(peer *pipeTransport) (CDPCommand, error) {
	payload, err := peer.ReadMessage()
	if err != nil {
		return CDPCommand{}, err
	}
	var command CDPCommand
	if err := json.Unmarshal(payload, &command); err != nil {
		return CDPCommand{}, fmt.Errorf("decode test command: %w", err)
	}
	return command, nil
}

//nolint:gocyclo // Exercise request and event routing together across two concurrent sessions.
func TestPipeConnectionRoutesSessionsAndEvents(t *testing.T) {
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	events := make(chan CDPMessage, 2)
	conn, peer := connectTestPipe(t, ctx, func(sessionID, method string, params any) {
		events <- CDPMessage{SessionID: sessionID, Method: method, Params: params}
	})
	peerResult := make(chan error, 1)
	go func() {
		commands := make([]CDPCommand, 2)
		for i := range commands {
			command, err := receiveTestCommand(peer)
			if err != nil {
				peerResult <- err
				return
			}
			commands[i] = command
		}
		// Responses arrive in the opposite order; session IDs must not be confused.
		for i := len(commands) - 1; i >= 0; i-- {
			command := commands[i]
			if err := peer.WriteJSON(ctx, CDPMessage{ID: &command.ID, Result: command.SessionID}); err != nil {
				peerResult <- err
				return
			}
			if err := peer.WriteJSON(ctx, CDPMessage{SessionID: command.SessionID, Method: "Page.event"}); err != nil {
				peerResult <- err
				return
			}
		}
		peerResult <- nil
	}()
	results := make(chan error, 2)
	for _, sessionID := range []string{"one", "two"} {
		go func() {
			response, err := conn.Session(sessionID).SendCommand(ctx, "Page.command", nil)
			if err == nil && response.Result != sessionID {
				err = fmt.Errorf("response routed to wrong session: %w", errInvalidCDPResponseFormat)
			}
			results <- err
		}()
	}
	for range 2 {
		if err := <-results; err != nil {
			t.Fatal(err)
		}
	}
	if err := <-peerResult; err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for range 2 {
		select {
		case event := <-events:
			if event.Method != "Page.event" {
				t.Fatalf("unexpected event: %+v", event)
			}
			seen[event.SessionID] = true
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		}
	}
	if !seen["one"] || !seen["two"] {
		t.Fatalf("missing session events: %+v", seen)
	}
}

func TestPipeConnectionBatchErrors(t *testing.T) {
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	conn, peer := connectTestPipe(t, ctx, nil)
	peerResult := make(chan error, 1)
	go func() {
		for range 2 {
			command, err := receiveTestCommand(peer)
			if err != nil {
				peerResult <- err
				return
			}
			response := CDPMessage{ID: &command.ID, Result: command.Method}
			if command.Method == "bad" {
				response.Error = map[string]any{"code": -1, "message": "rejected"}
			}
			if err := peer.WriteJSON(ctx, response); err != nil {
				peerResult <- err
				return
			}
		}
		peerResult <- nil
	}()
	results := conn.SendCommandBatch(ctx, []Command{{Method: "good"}, {Method: "bad"}})
	if results[0].Err != nil || results[0].Resp.Result != "good" {
		t.Fatalf("successful batch command = %+v", results[0])
	}
	if !errors.Is(results[1].Err, errCDPCommandResponse) {
		t.Fatalf("failed batch command = %+v", results[1])
	}
	if err := <-peerResult; err != nil {
		t.Fatal(err)
	}
	if results := conn.SendCommandBatch(ctx, nil); len(results) != 0 {
		t.Fatalf("empty batch = %+v", results)
	}
}

func TestPipeConnectionCommandCancellation(t *testing.T) {
	conn, peer := connectTestPipe(t, t.Context(), nil)
	ctx, cancel := context.WithCancel(t.Context())
	result := make(chan error, 1)
	go func() {
		_, err := conn.SendCommand(ctx, "Page.wait", nil)
		result <- err
	}()
	if _, err := receiveTestCommand(peer); err != nil {
		t.Fatal(err)
	}
	cancel()
	select {
	case err := <-result:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("canceled command = %v", err)
		}
	case <-time.After(time.Second):
		t.Fatal("command did not respond to cancellation")
	}
}

func TestPipeConnectionShutdownUnblocksCommandsAndReads(t *testing.T) {
	for _, shutdown := range []string{"close", "context", "eof"} {
		t.Run(shutdown, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			conn, peer := connectTestPipe(t, ctx, nil)
			result := make(chan error, 1)
			go func() {
				_, err := conn.SendCommand(t.Context(), "Page.wait", nil)
				result <- err
			}()
			if _, err := receiveTestCommand(peer); err != nil {
				t.Fatal(err)
			}
			switch shutdown {
			case "close":
				if err := conn.Close(); err != nil {
					t.Fatal(err)
				}
			case "context":
				cancel()
			case "eof":
				if err := peer.Close(); err != nil {
					t.Fatal(err)
				}
			}
			select {
			case err := <-result:
				if !errors.Is(err, errConnectionClosed) {
					t.Fatalf("command after shutdown = %v", err)
				}
			case <-time.After(time.Second):
				t.Fatal("command did not respond to shutdown")
			}
			select {
			case <-conn.Done():
			default:
				t.Fatal("connection Done did not close after shutdown")
			}
			if err := conn.Close(); err != nil {
				t.Fatalf("repeated Close() = %v", err)
			}
		})
	}
}
