import { useDatabaseStore } from "@/data/store";
import { cn } from "@/lib/utils";
import { DbmlFlow } from "./dbml-flow";

function DbmlViewer() {
  const { database } = useDatabaseStore();
  return (
    <div className={cn("h-[calc(100vh-90px)] bg-gray-100 p-3 rounded")}>
      <div className="w-full">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {database ? (
            <div className="border border-gray-200 rounded-lg">
              <DbmlFlow database={database} />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-[280px] flex items-center justify-center">
              <p className="text-gray-500">上传DBML文件</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DbmlViewer;
