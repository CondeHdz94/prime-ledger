#!/usr/bin/env bash
# PostToolUse (Edit|Write): oxlint sobre src tras cada edición.
#
# Cuesta ~0,2 s con el binario directo (con `pnpm exec` son 1,6 s), así que se
# lint-ea todo `src` en vez de resolver el archivo tocado desde el JSON del
# hook: más simple y más barato que el jq. El type-check no va aquí — `tsc -b`
# tarda 9 s y no es incremental; eso es trabajo de `pnpm build`.
#
# Se juzga por la SALIDA, no por el código de salida: oxlint reporta
# no-unused-vars como warning y termina en 0, así que mirar `$?` dejaba pasar
# justo lo que este hook debe atrapar. `src` está hoy en 0 bytes de salida, o
# sea que cualquier línea es algo recién introducido.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

OXLINT=./node_modules/.bin/oxlint
[ -x "$OXLINT" ] || exit 0   # sin deps instaladas no hay nada que decir

out=$("$OXLINT" src 2>&1)
if [ -n "$out" ]; then
  printf 'oxlint:\n%s\n' "$out" >&2
  exit 2   # 2 = el resultado vuelve a Claude para que lo arregle
fi
exit 0
