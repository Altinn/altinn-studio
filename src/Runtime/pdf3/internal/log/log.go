package log

import "log"

func Setup() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
}
