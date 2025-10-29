package crypto

import (
	"context"
	"crypto/x509"
	"testing"
	"time"

	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/test/utils"
	"github.com/jonboulle/clockwork"
)

func benchmarkCreateJwks(b *testing.B, algo x509.SignatureAlgorithm, keySize int) {
	operatorCtx := operatorcontext.DiscoverOrDie(context.Background(), operatorcontext.EnvironmentLocal, nil)
	clock := clockwork.NewFakeClockAt(time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC))
	random := utils.NewDeterministicRand()
	service := NewService(operatorCtx, clock, random, algo, keySize)
	certCommonName := "benchmark"
	notAfter := clock.Now().UTC().Add(30 * 24 * time.Hour)

	b.ReportAllocs()
	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		if _, err := service.CreateJwks(certCommonName, notAfter); err != nil {
			b.Fatalf("CreateJwks: %v", err)
		}
	}
}

func BenchmarkCreateJwks_SHA256RSA2048(b *testing.B) {
	benchmarkCreateJwks(b, x509.SHA256WithRSA, 2048)
}

func BenchmarkCreateJwks_SHA512RSA4096(b *testing.B) {
	benchmarkCreateJwks(b, x509.SHA512WithRSA, 4096)
}
