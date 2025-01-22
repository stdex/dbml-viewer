import { Parser } from "@dbml/core";
import { Suspense, useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import AppLayout from "./components/app-layout";
import Loader from "./components/custom/loader";
import DbmlViewer from "./components/dbml-viewer";
import TableViewer from "./components/table";
import { useDatabaseStore } from "./data/store";

// 创建路由配置
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loader />}>
            <DbmlViewer />
          </Suspense>
        ),
      },
      {
        path: "/:schema/:table",
        element: (
          <Suspense fallback={<Loader />}>
            <TableViewer />
          </Suspense>
        ),
      },
    ],
  },
]);

function App() {
  const { setDatabase } = useDatabaseStore();

  useEffect(() => {
    const database = localStorage.getItem("database");
    if (!database) {
      fetch("/test.dbml")
        .then((res) => res.text())
        .then((text) => {
          localStorage.setItem("database", text);
          const parser = new Parser();
          const parsedDbml = parser.parse(text, "dbmlv2");
          const database = parsedDbml.export();
          setDatabase(database);
        });
    }
  }, []);
  return (
    <ReactFlowProvider>
      <RouterProvider router={router} />
    </ReactFlowProvider>
  );
}

export default App;
