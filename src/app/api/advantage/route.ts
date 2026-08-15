import { ADVANTAGE_TASKS, renderAdvantageMarkdown } from "@/domain/advantage";
import { NextResponse } from "next/server";

export async function GET() {
  const at = new Date().toISOString();
  return NextResponse.json({
    tasks: ADVANTAGE_TASKS,
    markdown: renderAdvantageMarkdown(at),
    at,
  });
}
