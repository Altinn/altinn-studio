package cdp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"
)

// connectTestPipe connects to a fake browser, the returned peer. maxMessageSize limits the
// messages the connection reads, 0 keeps the default.
//
//nolint:ireturn // Tests exercise the public Connection interface.
func connectTestPipe(
	t *testing.T,
	ctx context.Context,
	handler EventHandler,
	maxMessageSize int,
) (Connection, *pipeTransport) {
	t.Helper()
	commandReader, commandWriter := io.Pipe()
	responseReader, responseWriter := io.Pipe()
	transport := newPipeTransport(responseReader, commandWriter, testWriteTimeout)
	if maxMessageSize > 0 {
		transport.maxMessageSize = maxMessageSize
	}
	conn := newConnection(ctx, 0, transport, handler)
	peer := newPipeTransport(commandReader, responseWriter, testWriteTimeout)
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
	}, 0)
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

func TestPipeConnectionBatchKeepsOrder(t *testing.T) {
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	conn, peer := connectTestPipe(t, ctx, nil, 0)
	methods := []string{"first", "bad", "third"}
	peerResult := make(chan error, 1)
	go func() {
		// Read the whole batch before answering: the commands must not wait for each other
		commands := make([]CDPCommand, len(methods))
		for i := range commands {
			command, err := receiveTestCommand(peer)
			if err != nil {
				peerResult <- err
				return
			}
			if command.Method != methods[i] || command.SessionID != "page" {
				peerResult <- fmt.Errorf("command %d = %+v: %w", i, command, errInvalidCDPResponseFormat)
				return
			}
			commands[i] = command
		}
		for i := len(commands) - 1; i >= 0; i-- {
			response := CDPMessage{ID: &commands[i].ID, Result: commands[i].Method}
			if commands[i].Method == "bad" {
				response.Error = map[string]any{"code": -1, "message": "rejected"}
			}
			if err := peer.WriteJSON(ctx, response); err != nil {
				peerResult <- err
				return
			}
		}
		peerResult <- nil
	}()
	batch := make([]Command, len(methods))
	for i, method := range methods {
		batch[i] = Command{Method: method}
	}
	results := conn.Session("page").SendCommandBatch(ctx, batch)
	if err := <-peerResult; err != nil {
		t.Fatal(err)
	}
	if results[0].Err != nil || results[0].Resp.Result != "first" || results[2].Err != nil ||
		results[2].Resp.Result != "third" {
		t.Fatalf("successful batch commands = %+v, %+v", results[0], results[2])
	}
	if !errors.Is(results[1].Err, errCDPCommandResponse) {
		t.Fatalf("failed batch command = %+v", results[1])
	}
	if results := conn.SendCommandBatch(ctx, nil); len(results) != 0 {
		t.Fatalf("empty batch = %+v", results)
	}
}

func TestPipeConnectionCommandCancellation(t *testing.T) {
	conn, peer := connectTestPipe(t, t.Context(), nil, 0)
	ctx, cancel := context.WithCancel(t.Context())
	result := make(chan error, 1)
	go func() {
		_, err := conn.SendCommand(ctx, "Page.wait", nil)
		result <- err
	}()
	command, err := receiveTestCommand(peer)
	if err != nil {
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

	// The late response is ignored and the connection keeps working
	if err := peer.WriteJSON(t.Context(), CDPMessage{ID: &command.ID}); err != nil {
		t.Fatal(err)
	}
	if err := respondOnce(t, conn, peer, func(id int64) any { return CDPMessage{ID: &id, Result: "ok"} }); err != nil {
		t.Fatalf("command after a late response = %v", err)
	}
}

// respondOnce sends a command on conn and answers it with the message built by respond.
func respondOnce(t *testing.T, conn Connection, peer *pipeTransport, respond func(id int64) any) error {
	t.Helper()
	peerResult := make(chan error, 1)
	go func() {
		command, err := receiveTestCommand(peer)
		if err == nil {
			err = peer.WriteJSON(t.Context(), respond(command.ID))
		}
		peerResult <- err
	}()
	ctx, cancel := context.WithTimeout(t.Context(), 5*time.Second)
	defer cancel()
	_, err := conn.SendCommand(ctx, "Page.command", nil)
	if peerErr := <-peerResult; peerErr != nil {
		t.Fatal(peerErr)
	}
	if err != nil {
		return fmt.Errorf("send test command: %w", err)
	}
	return nil
}

func TestPipeConnectionSkipsOversizedMessages(t *testing.T) {
	const limit = 1024
	events := make(chan string, 2)
	conn, peer := connectTestPipe(t, t.Context(), func(_, method string, _ any) {
		events <- method
	}, limit)
	huge := strings.Repeat("y", 2*limit)

	// A huge event, such as a console message from the page, is dropped
	if err := peer.WriteJSON(
		t.Context(),
		map[string]any{"method": "Runtime.consoleAPICalled", "params": huge},
	); err != nil {
		t.Fatal(err)
	}
	// A huge response fails only its command
	err := respondOnce(t, conn, peer, func(id int64) any {
		// Laid out like Chrome's responses, which start with the ID
		return json.RawMessage(fmt.Sprintf(`{"id":%d,"result":%q}`, id, huge))
	})
	if !errors.Is(err, errPipeMessageTooLarge) || !errors.Is(err, errCDPCommandResponse) {
		t.Fatalf("oversized response = %v", err)
	}

	if err := peer.WriteJSON(t.Context(), map[string]any{"method": "Page.loadEventFired"}); err != nil {
		t.Fatal(err)
	}
	if err := respondOnce(t, conn, peer, func(id int64) any { return CDPMessage{ID: &id, Result: "ok"} }); err != nil {
		t.Fatalf("command after oversized messages = %v", err)
	}
	select {
	case method := <-events:
		if method != "Page.loadEventFired" {
			t.Fatalf("oversized event was delivered: %s", method)
		}
	case <-time.After(time.Second):
		t.Fatal("event after oversized messages was not delivered")
	}
	select {
	case <-conn.Done():
		t.Fatal("oversized messages closed the connection")
	default:
	}
}

func TestPipeConnectionShutdownUnblocksCommandsAndReads(t *testing.T) {
	for _, shutdown := range []string{"close", "context", "eof"} {
		t.Run(shutdown, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			conn, peer := connectTestPipe(t, ctx, nil, 0)
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
