import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDatabaseStore } from "@/data/store";
import { useParams } from "react-router-dom";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const isSelected = table.getFilteredSelectedRowModel().rows.length > 0;

  // 获取数据库
  const { database } = useDatabaseStore();
  // 获取表名
  const { table: tableName } = useParams();

  // 获取所有类型
  const types = () => {
    const table = database?.schemas[0]?.tables.find(
      (table) => table.name === tableName
    );

    if (!table || !table.fields) return [];

    // 获取所有类型，去重, 去除字符串后面的()
    const types = [
      ...new Set(
        table.fields.map((field) => field.type.type_name.replace(/\(\d+\)/, ""))
      ),
    ];

    return types.map((type) => ({
      label: type,
      value: type,
    }));
  };

  console.log("types", types());

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2">
        <Input
          placeholder="搜索"
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
            <X /> 重置
          </Button>
        )}
      </div>
      <div className="flex items-center gap-x-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
