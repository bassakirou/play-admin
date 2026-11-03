export type Metric = number | null;
export type History = {
  at: string;
  cpuPercent: Metric;
  memoryPercent: Metric;
  diskPercent: Metric;
  networkTxBps: Metric;
  activeSessions: Metric;
};
export type Probe = {
  probeId: string;
  observedAt: string;
  status: string;
  latencyMs: Metric;
};
export type Overview = {
  thresholds?: {
    cpu: number;
    cpuConsecutiveSamples: number;
    memory: number;
    disk: number;
    diskCritical: number;
    network: number;
  };
  hosts: { id: string; lastSeenAt: string }[];
  hostId: string | null;
  latest: null | {
    sampledAt: string;
    cpuPercent: Metric;
    memoryPercent: Metric;
    diskPercent: Metric;
    nodeRssBytes: Metric;
    networkRxBps: Metric;
    networkTxBps: Metric;
    networkCapacityMbps: Metric;
    databaseOk: boolean | null;
    minioOk: boolean | null;
    databaseMs: Metric;
    minioMs: Metric;
    disks: {
      path: string;
      totalBytes: number;
      availableBytes: number;
      usedPercent: number;
    }[];
  };
  history: History[];
  probes: Probe[];
  probeFailures: Probe[];
  audience: {
    activeSessions: number;
    starts: number;
    playedSeconds: number;
    bufferSeconds: number;
    stalls: number;
    errors: number;
    errorSessions: number;
    startupMsAvg: Metric;
    topVideos: {
      videoId: string;
      title: string;
      sessions: number;
      playedSeconds: number;
    }[];
    quality: { height: Metric; sessions: number }[];
  };
  alerts: {
    id: string;
    key: string;
    severity: string;
    message: string;
    openedAt: string;
    lastSeenAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
  }[];
  cloudflare: {
    state: "unconfigured" | "ready" | "stale" | "error";
    month: string;
    fetchedAt: string | null;
    deliveryMinutes: Metric;
    storageUsedMinutes: Metric;
    storageCapacityMinutes: Metric;
    deliveryUsd: Metric;
    storageCapacityUsd: Metric;
    totalUsd: Metric;
    projectedDeliveryUsd: Metric;
    projectedTotalUsd: Metric;
    budgetUsd: Metric;
    countries: { code: string; minutes: number }[];
    daily: { date: string; minutes: number }[];
    error: string | null;
    estimated: true;
  };
};
