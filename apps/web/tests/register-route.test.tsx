import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
}));

vi.mock("@/lib/server/platform-settings-repository", () => ({
  getPlatformSettingsRepository: () => ({
    getSettings: mocks.getSettings,
  }),
}));

import RegisterRoute from "@/app/register/page";

describe("register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettings.mockResolvedValue({ registrationPaused: false });
  });

  it("passes registration paused state to the registration page", async () => {
    mocks.getSettings.mockResolvedValue({ registrationPaused: true });

    const result = await RegisterRoute({ searchParams: Promise.resolve({}) });

    expect(result.type.name).toBe("RegisterPage");
    expect(result.props.registrationPaused).toBe(true);
  });
});
