package testutils

import (
	"io"
	"math/rand/v2"
	"sync"
)

type deterministicRand struct {
	prng *rand.Rand
	mu   sync.Mutex
}

func NewDeterministicRand() io.Reader {
	var seed [32]byte
	seed[0] = 0x13
	seed[1] = 0x37
	return &deterministicRand{
		//nolint:gosec // Test snapshots require deterministic output, not cryptographic randomness.
		prng: rand.New(rand.NewChaCha8(seed)),
	}
}

func (r *deterministicRand) Read(p []byte) (n int, err error) {
	const byteRange = 256

	if len(p) == 1 {
		// Work around randutil.MaybeReadByte, while keeping snapshots deterministic.
		return 1, nil
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range p {
		//nolint:gosec // UintN(256) is intentionally bounded to a single byte for deterministic test data.
		p[i] = byte(r.prng.UintN(byteRange))
	}
	return len(p), nil
}
