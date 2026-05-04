import { describe, it, expect } from "vitest";

// Test the baseline/severity logic in isolation.
// These are pure functions extracted to test the core algorithm without DB deps.

const THRESHOLDS: Record<string, [number, number]> = {
  error_rate: [2, 5],
  latency_p95: [1.5, 3],
  slow_db: [2, 4],
};

const EMA_ALPHA = 0.1;

function classifySeverity(
  currentValue: number,
  baselineValue: number,
  metricType: string
): "info" | "warning" | "critical" {
  if (baselineValue <= 0) return "info";
  const [warnThreshold, critThreshold] = THRESHOLDS[metricType] ?? [2, 5];
  const ratio = currentValue / baselineValue;
  if (ratio >= critThreshold) return "critical";
  if (ratio >= warnThreshold) return "warning";
  return "info";
}

function computeEMA(currentValue: number, previousAvg: number): number {
  return Math.round(EMA_ALPHA * currentValue + (1 - EMA_ALPHA) * previousAvg);
}

function isMonitored(appName: string, monitoredApps: string[]): boolean {
  if (monitoredApps.length === 0) return true;
  return monitoredApps.some(
    (m) => appName === m || appName.startsWith(m + " /") || appName.startsWith(m + "/")
  );
}

describe("severity classification", () => {
  describe("error_rate thresholds (2x/5x)", () => {
    it("returns info when under 2x", () => {
      expect(classifySeverity(15, 10, "error_rate")).toBe("info");
      expect(classifySeverity(19, 10, "error_rate")).toBe("info");
    });

    it("returns warning at exactly 2x", () => {
      expect(classifySeverity(20, 10, "error_rate")).toBe("warning");
    });

    it("returns warning between 2x and 5x", () => {
      expect(classifySeverity(30, 10, "error_rate")).toBe("warning");
      expect(classifySeverity(49, 10, "error_rate")).toBe("warning");
    });

    it("returns critical at exactly 5x", () => {
      expect(classifySeverity(50, 10, "error_rate")).toBe("critical");
    });

    it("returns critical above 5x", () => {
      expect(classifySeverity(100, 10, "error_rate")).toBe("critical");
    });
  });

  describe("latency_p95 thresholds (1.5x/3x)", () => {
    it("returns info when under 1.5x", () => {
      expect(classifySeverity(140, 100, "latency_p95")).toBe("info");
    });

    it("returns warning at 1.5x", () => {
      expect(classifySeverity(150, 100, "latency_p95")).toBe("warning");
    });

    it("returns critical at 3x", () => {
      expect(classifySeverity(300, 100, "latency_p95")).toBe("critical");
    });
  });

  describe("slow_db thresholds (2x/4x)", () => {
    it("returns info under 2x", () => {
      expect(classifySeverity(150, 100, "slow_db")).toBe("info");
    });

    it("returns warning at 2x", () => {
      expect(classifySeverity(200, 100, "slow_db")).toBe("warning");
    });

    it("returns critical at 4x", () => {
      expect(classifySeverity(400, 100, "slow_db")).toBe("critical");
    });
  });

  describe("edge cases", () => {
    it("returns info when baseline is 0", () => {
      expect(classifySeverity(100, 0, "error_rate")).toBe("info");
    });

    it("returns info when baseline is negative", () => {
      expect(classifySeverity(100, -10, "error_rate")).toBe("info");
    });

    it("returns info when current equals baseline", () => {
      expect(classifySeverity(100, 100, "error_rate")).toBe("info");
    });

    it("returns info when current is below baseline", () => {
      expect(classifySeverity(5, 100, "error_rate")).toBe("info");
    });

    it("uses default thresholds for unknown metric type", () => {
      expect(classifySeverity(200, 100, "unknown_metric")).toBe("warning");
      expect(classifySeverity(500, 100, "unknown_metric")).toBe("critical");
    });
  });
});

describe("EMA computation", () => {
  it("moves avg toward current value", () => {
    const result = computeEMA(200, 100);
    // 0.1 * 200 + 0.9 * 100 = 20 + 90 = 110
    expect(result).toBe(110);
  });

  it("is stable when current equals avg", () => {
    expect(computeEMA(100, 100)).toBe(100);
  });

  it("converges over many updates", () => {
    let avg = 100;
    for (let i = 0; i < 50; i++) {
      avg = computeEMA(200, avg);
    }
    expect(avg).toBeGreaterThan(195);
    expect(avg).toBeLessThanOrEqual(200);
  });

  it("handles zero values", () => {
    expect(computeEMA(0, 100)).toBe(90);
    expect(computeEMA(100, 0)).toBe(10);
  });

  it("rounds to integer", () => {
    const result = computeEMA(1, 1);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("isMonitored", () => {
  it("monitors everything when list is empty", () => {
    expect(isMonitored("Anything", [])).toBe(true);
  });

  it("matches exact app name", () => {
    expect(isMonitored("Selling", ["Selling"])).toBe(true);
    expect(isMonitored("Other", ["Selling"])).toBe(false);
  });

  it("matches sub-apps with space-slash", () => {
    expect(isMonitored("Selling / Purchase", ["Selling"])).toBe(true);
    expect(isMonitored("Selling / Grooming", ["Selling"])).toBe(true);
  });

  it("matches sub-apps with slash", () => {
    expect(isMonitored("Selling/Purchase", ["Selling"])).toBe(true);
  });

  it("does not match partial prefix", () => {
    expect(isMonitored("SellingExtra", ["Selling"])).toBe(false);
  });

  it("matches any in list", () => {
    expect(isMonitored("Selling-Ingestion / Host", ["Selling", "Selling-Ingestion"])).toBe(true);
    expect(isMonitored("Other", ["Selling", "Selling-Ingestion"])).toBe(false);
  });
});
