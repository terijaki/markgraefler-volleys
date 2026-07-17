#!/usr/bin/env bash
set -euo pipefail

log() {
  echo "[worktree-setup] $*"
}

resolve_upstream() {
  local branch upstream

  branch="$(git rev-parse --abbrev-ref HEAD)"

  if upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then
    printf '%s\n' "$upstream"
    return 0
  fi

  if git show-ref --verify --quiet "refs/remotes/origin/${branch}"; then
    printf 'origin/%s\n' "$branch"
    return 0
  fi

  if git show-ref --verify --quiet refs/remotes/origin/main; then
    printf 'origin/main\n'
    return 0
  fi

  return 1
}

sync_branch_with_origin() {
  local upstream behind

  log "fetching from origin..."
  git fetch origin

  if ! upstream="$(resolve_upstream)"; then
    log "no origin upstream found, skipping branch sync"
    return 0
  fi

  behind="$(git rev-list --count "HEAD..${upstream}" 2>/dev/null || echo 0)"
  if [ "${behind}" -gt 0 ]; then
    log "branch is ${behind} commit(s) behind ${upstream}, merging..."
    if ! git merge --ff-only "${upstream}"; then
      git merge "${upstream}" -m "Merge ${upstream} into worktree branch"
    fi
  else
    log "branch is up to date with ${upstream}"
  fi
}

log "starting worktree setup"
sync_branch_with_origin
log "installing dependencies..."
vp install
log "done"
