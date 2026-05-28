import { NextResponse } from "next/server";

import { platformProjects } from "@/lib/platform-projects";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ projects: platformProjects });
}
