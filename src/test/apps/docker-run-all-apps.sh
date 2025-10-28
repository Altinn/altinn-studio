#!/bin/bash
trap 'kill -TERM 0; wait; exit 0' SIGTERM SIGINT
make run-all & wait
