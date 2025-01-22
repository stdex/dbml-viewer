import { Database, Table } from "@/data/database";
import { useDatabaseStore } from "@/data/store";
import { useEffect, useState, type FC } from "react";
import { useParams } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { columns } from "./components/columns";
import { DataTable } from "./components/data-table";
import DbmlViewer from "./dbml-viewer";

interface TableViewerProps {}

const TableViewer: FC<TableViewerProps> = () => {
  const { schema, table } = useParams();

  const { getTable } = useDatabaseStore();
  const [currentTable, setCurrentTable] = useState<Table | undefined>(
    undefined
  );
  const [currentDB, setCurrentDB] = useState<Database | undefined>(undefined);

  useEffect(() => {
    const db = getTable(schema || "", table || "");
    if (db) {
      // 查找表
      const ctb = db.schemas[0].tables.find((t) => t.name === table);
      console.log(ctb);
      setCurrentTable(ctb);
      setCurrentDB(db);
    }
  }, [schema, table]);

  return (
    <div className="flex flex-col gap-2">
      <Accordion type="multiple" className="w-full" defaultValue={["dbml"]}>
        <AccordionItem value="table">
          <AccordionTrigger>表结构</AccordionTrigger>
          <AccordionContent>
            <DataTable columns={columns} data={currentTable?.fields || []} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="dbml">
          <AccordionTrigger>DBML</AccordionTrigger>
          <AccordionContent>
            <DbmlViewer database={currentDB} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default TableViewer;
