import { Row } from "@tanstack/react-table";

import { Button } from "@/components/ui/button.tsx";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  // // const task = taskSchema.parse(row.original);
  const nav = useNavigate();

  const toViews = () => {
    nav(`/store/${row.getValue("id")}/docs`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={toViews}>
        <Eye />
      </Button>
    </div>
  );
}
