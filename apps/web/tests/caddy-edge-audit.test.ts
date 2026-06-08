import { describe, expect, it } from "vitest";

import {
  extractBearerToken,
  isValidIngestToken,
  parseCaddyAccessLogEntry,
  parseCaddyAccessLogPayload,
} from "@/lib/server/caddy-edge-audit";

describe("caddy edge audit", () => {
  it("parses and sanitizes Caddy access log entries", () => {
    const event = parseCaddyAccessLogEntry({
      request: {
        headers: { "User-Agent": ["curl/8.5.0"] },
        method: "GET",
        remote_ip: "203.0.113.44",
        uri: "/.env?token=secret&x=1",
      },
      status: 404,
    });

    expect(event).toMatchObject({
      eventType: "edge_suspicious_scan",
      ip: "203.0.113.44",
      method: "GET",
      path: "/.env?token=%5Bredacted%5D&x=1",
      statusCode: 404,
      userAgent: "curl",
    });
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  it("accepts Caddy NDJSON and JSON array payloads", () => {
    const ndjson = [
      JSON.stringify({ request: { method: "GET", remote_ip: "203.0.113.1", uri: "/api/unknown" }, status: 404 }),
      JSON.stringify({ request: { method: "GET", remote_ip: "203.0.113.2", uri: "/projects" }, status: 307 }),
    ].join("\n");
    const array = JSON.stringify([{ request: { method: "GET", remote_ip: "203.0.113.3", uri: "/wp-admin" }, status: 404 }]);

    expect(parseCaddyAccessLogPayload(ndjson).map((event) => event.eventType)).toEqual(["edge_not_found", "edge_request"]);
    expect(parseCaddyAccessLogPayload(array)).toHaveLength(1);
  });

  it("checks ingest tokens without accepting missing values", () => {
    expect(isValidIngestToken("test-token", "test-token")).toBe(true);
    expect(isValidIngestToken("wrong-token", "test-token")).toBe(false);
    expect(isValidIngestToken(null, "test-token")).toBe(false);
    expect(isValidIngestToken("test-token", undefined)).toBe(false);
  });

  it("extracts bearer token only from bearer authorization", () => {
    expect(extractBearerToken("Bearer test-token")).toBe("test-token");
    expect(extractBearerToken("Basic test-token")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });
});
