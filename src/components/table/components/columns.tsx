import { Field } from "@/data/database";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "./data-table-column-header";

export const columns: ColumnDef<Field>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="名称" />
    ),
    cell: ({ row }) => (
      <div className="w-[120px] flex items-center gap-2">
        {row.getValue("name")}
      </div>
    ),
    meta: { title: "名称" },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="类型" />
    ),
    cell: ({ row }) => {
      const type: any = row.getValue("type");
      return <div className="w-[120px]">{type?.type_name}</div>;
    },
    meta: { title: "类型" },
  },
  {
    accessorKey: "note",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="备注" />
    ),
    cell: ({ row }) => <div className="w-[320px]">{row.getValue("note")}</div>,
    meta: { title: "备注" },
  },
  // {
  //   id: "actions",
  //   cell: ({ row }) => <DataTableRowActions row={row} />,
  // },
];
