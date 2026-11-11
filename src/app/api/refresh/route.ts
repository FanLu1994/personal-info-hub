import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Refresh disabled in production",
      message: "在线刷新已禁用。数据通过构建时预生成，避免公开端点被滥用产生费用。",
      suggestion: "如需更新数据，请触发新的部署构建。",
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      message: "Refresh endpoint (disabled in production)",
      reason: "防止公开端点被滥用，产生不必要的外部 API 请求费用",
      updateMethod: "数据在部署构建时预生成，触发新部署即可更新",
    },
    { status: 405 }
  );
}
