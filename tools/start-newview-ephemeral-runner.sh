#!/usr/bin/env bash
# Run ONLY in an owner-approved disposable Linux VM, from an official runner root.
# This does not download software, configure networking, or change GitHub settings.
set -euo pipefail
set +x
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 && "$(id -u)" -ne 0 ]] || exit 1
: "${NEWVIEW_RUNNER_ROOT:?Set the dedicated official runner installation directory}"
NEWVIEW_RUNNER_ROOT="$(realpath "$NEWVIEW_RUNNER_ROOT")"
export NEWVIEW_RUNNER_ROOT
[[ "$NEWVIEW_RUNNER_ROOT" != / && "$NEWVIEW_RUNNER_ROOT" != "$HOME" ]] || exit 1
cd "$NEWVIEW_RUNNER_ROOT"
[[ -f config.sh && -f run.sh && ! -e .runner ]] || { echo 'Use a fresh official runner installation.' >&2; exit 1; }
[[ -f /etc/newview-runner-isolation.json ]] || { echo 'Owner must approve VM/network isolation first.' >&2; exit 1; }
runner_pid=''
cleanup() {
  unset ACTIONS_RUNNER_INPUT_TOKEN
  if [[ -n "$runner_pid" ]] && kill -0 "$runner_pid" 2>/dev/null; then
    kill -- "-$runner_pid" 2>/dev/null || true
    sleep 2
    kill -KILL -- "-$runner_pid" 2>/dev/null || true
    wait "$runner_pid" 2>/dev/null || true
  fi
  # Server-side ephemeral registration expires after one job. On interruption the
  # owner must delete the offline registration and destroy the VM (see runbook).
  rm -f -- "$NEWVIEW_RUNNER_ROOT/.credentials" "$NEWVIEW_RUNNER_ROOT/.credentials_rsaparams" "$NEWVIEW_RUNNER_ROOT/.runner"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
read -r -s -p 'Fresh registration token (hidden, never sent to chat): ' ACTIONS_RUNNER_INPUT_TOKEN
printf '\n'
export ACTIONS_RUNNER_INPUT_TOKEN
./config.sh --unattended --ephemeral --url https://github.com/faisalwrokksa-hub/nowview \
  --name "newview-ephemeral-$(date +%s)" --labels newview-ci-isolated --work _work
unset ACTIONS_RUNNER_INPUT_TOKEN
setsid ./run.sh & runner_pid=$!
wait "$runner_pid"
