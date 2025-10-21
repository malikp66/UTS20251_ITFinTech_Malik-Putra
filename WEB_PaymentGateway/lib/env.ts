export function getAppEnv(): string {
  return (process.env.APP_ENV ?? process.env.NODE_ENV ?? "production").toLowerCase();
}

export function isDevEnv(): boolean {
  const env = getAppEnv();
  return env === "dev" || env === "development";
}
