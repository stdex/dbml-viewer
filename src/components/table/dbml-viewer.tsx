import { Database } from "@/data/database";
import { DbmlFlow } from "../dbml-flow";

interface DbmlViewerProps {
  database?: Database;
}

function DbmlViewer({ database }: DbmlViewerProps) {
  return (
    <div className="h-[calc(100vh-220px)] bg-gray-100 p-3 rounded">
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="border border-gray-200 rounded-lg">
            <DbmlFlow database={database} className="h-[calc(100vh-290px)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DbmlViewer;
