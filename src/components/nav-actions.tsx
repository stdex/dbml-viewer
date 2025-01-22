"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GalleryVerticalEnd,
  Link,
  MoreHorizontal,
  Upload,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCallback, useEffect, useState } from "react";
import { Parser } from "@dbml/core";
import { cn } from "@/lib/utils";
import { Database } from "@/data/database";
import { useDatabaseStore } from "@/data/store";

const data = [
  [
    {
      label: "复制链接",
      icon: Link,
    },
    {
      label: "复制",
      icon: Copy,
    },
    {
      label: "查看历史",
      icon: GalleryVerticalEnd,
    },
  ],
  [
    {
      label: "导入",
      icon: ArrowUp,
    },
    {
      label: "导出",
      icon: ArrowDown,
    },
  ],
];

interface NavActionsProps {}

export function NavActions({}: NavActionsProps) {
  const [dbmlContent, setDbmlContent] = useState<string>("");
  const { setDatabase } = useDatabaseStore();

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setDbmlContent(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    },
    []
  );

  useEffect(() => {
    if (dbmlContent) {
      const parser = new Parser();
      const parsedDbml = parser.parse(dbmlContent, "dbmlv2");
      const database = parsedDbml.export();
      setDatabase(database);
    }
  }, [dbmlContent]);

  const UploadButton = () => {
    return (
      <label className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
        <Upload size={20} />
        导入DBML
        <input
          type="file"
          accept=".dbml"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
    );
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <UploadButton />
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 data-[state=open]:bg-accent"
          >
            <MoreHorizontal />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 overflow-hidden rounded-lg p-0"
          align="end"
        >
          <Sidebar collapsible="none" className="bg-transparent">
            <SidebarContent>
              {data.map((group, index) => (
                <SidebarGroup key={index} className="border-b last:border-none">
                  <SidebarGroupContent className="gap-0">
                    <SidebarMenu>
                      {group.map((item, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton>
                            <item.icon /> <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
          </Sidebar>
        </PopoverContent>
      </Popover>
    </div>
  );
}
