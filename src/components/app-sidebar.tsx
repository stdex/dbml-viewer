import type { LucideIcon } from "lucide-react";
import { Blocks } from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useDatabaseStore } from "@/data/store";
import { LogoViewer } from "./logo-viewer";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  children?: NavItem[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { database } = useDatabaseStore();

  const generateNavItems = React.useMemo(() => {
    if (!database) return [];

    const navItems: NavItem[] = [];

    // 按 schema 分组处理
    database.schemas.forEach((schema) => {
      const schemaItem = {
        title: schema.name,
        url: `#${schema.name}`,
        icon: Blocks,
        children: [] as NavItem[],
      };

      if (schema.tables.length > 0) {
        schema.tables.forEach((table) => {
          schemaItem.children.push({
            title: `${table.name}${table.note ? ` (${table.note})` : ""}`,
            url: `/${schema.name}/${table.name}`,
            icon: Blocks,
          });
        });
      }

      // 只有当 schema 下有内容时才添加到导航
      if (schemaItem.children.length > 0) {
        navItems.push(schemaItem);
      }
    });

    return navItems;
  }, [database]);

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <LogoViewer />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={generateNavItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
