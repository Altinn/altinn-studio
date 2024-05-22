:<<"::CMDLITERAL"
@CALL scripts\run.bat %*
@GOTO :EOF
::CMDLITERAL
"$(cd "$(dirname "$0")"; pwd)/scripts/run.sh" "$@"
