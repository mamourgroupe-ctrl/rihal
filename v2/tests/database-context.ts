export interface TestDatabaseConnections {
  // Ephemeral loopback-only database; URLs contain no passwords.
  runtimeUrl: string;
  ownerUrl: string;
  platformUrl: string;
  bootstrapUrl: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    database: TestDatabaseConnections;
  }
}
