import type { ModuleId, ModuleInfo } from "../models/types";

export const MODULES: ModuleInfo[] = [
  {
    id: "seo",
    name: "SEO OS",
    status: "available",
    connection: "not_connected",
    description: "Theo dõi và tối ưu hiệu suất tìm kiếm tự nhiên.",
    route: "/",
    detailRoute: "/modules/seo",
  },
  {
    id: "gtm",
    name: "GTM OS",
    status: "planned",
    connection: "not_connected",
    description: "Quản lý tag và tracking.",
    route: undefined,
    detailRoute: "/modules/gtm",
  },
  {
    id: "content",
    name: "Content OS",
    status: "planned",
    connection: "not_connected",
    description: "Lập kế hoạch và vận hành nội dung.",
    route: undefined,
    detailRoute: "/modules/content",
  },
  {
    id: "analytics",
    name: "Analytics OS",
    status: "planned",
    connection: "not_connected",
    description: "Tổng hợp phân tích và báo cáo.",
    route: undefined,
    detailRoute: "/modules/analytics",
  },
];

export function getModule(id: ModuleId): ModuleInfo | undefined {
  return MODULES.find((m) => m.id === id);
}
