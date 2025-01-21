import React, { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { DbmlFlow } from "./components/DbmlFlow";

function App() {
  const [dbmlContent, setDbmlContent] = useState<string>("");

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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">DBML Viewer</h1>

          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
              <Upload size={20} />
              Upload DBML
              <input
                type="file"
                accept=".dbml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {dbmlContent ? (
            <div className="border border-gray-200 rounded-lg">
              <DbmlFlow dbml={dbmlContent} />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <p className="text-gray-500">
                Upload a DBML file to preview it here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
