/**
 * Environment variables that force Bun (and common tooling) to write caches under
 * `/tmp` on Lambda, where `/var/task` is read-only.
 *
 * Applied in {@link MvBunFunction} after caller-supplied `environment` so overrides
 * cannot weaken these paths. Mirrored by `lib/buntime/bootstrap` before `exec`.
 */
export const BUN_LAMBDA_WRITABLE_ENV = {
  HOME: "/tmp",
  TMPDIR: "/tmp",
  XDG_CACHE_HOME: "/tmp/.cache",
  BUN_INSTALL_CACHE_DIR: "/tmp/.bun-install-cache",
  BUN_RUNTIME_TRANSPILER_CACHE_PATH: "/tmp/.bun-transpiler-cache",
} as const;

export const BUN_LAMBDA_TASK_BUNFIG = `[install]
auto = "disable"
`;
