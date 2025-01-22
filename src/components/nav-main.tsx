"use client";

import { ChevronRight, Table, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Link } from "react-router-dom";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  children?: NavItem[];
}

// 新增递归菜单组件
function RecursiveMenuItem({ item }: { item: NavItem }) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild className="group/collapsible">
          <SidebarMenuButton tooltip={item.title}>
            {item.icon ? (
              <item.icon />
            ) : (
              // 如果没有指定图标且没有子节点，显示 Table 图标
              !hasChildren && <Table className="h-4 w-4" />
            )}
            <span>{item.title}</span>
            {hasChildren && (
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            )}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        {hasChildren && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children?.map((subItem) =>
                subItem.children && subItem.children.length > 0 ? (
                  <RecursiveMenuItem key={subItem.title} item={subItem} />
                ) : (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton asChild>
                      <Link to={subItem.url}>
                        <Table className="h-4 w-4" />
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )
              )}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Schema</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <RecursiveMenuItem
            key={item.title}
            item={{
              ...item,
              isActive: true, // 设置第一层菜单默认打开
            }}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
