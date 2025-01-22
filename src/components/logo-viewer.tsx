import { Database } from "lucide-react";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

export function LogoViewer() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2">
          <Database className="size-4" />
          <span className="truncate font-semibold">DBML Viewer</span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
