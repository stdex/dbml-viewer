import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import AppLayout from "./components/app-layout";
import Loader from "./components/custom/loader";
import DbmlViewer from "./components/dbml-viewer";
import TableViewer from "./components/table";

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
  return (
    <ReactFlowProvider>
      <RouterProvider router={router} />
    </ReactFlowProvider>
  );
}

export default App;
