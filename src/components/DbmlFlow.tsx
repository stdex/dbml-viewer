import React, { useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ConnectionMode,
  Position,
  MarkerType,
  Handle,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";

interface TableColumn {
  name: string;
  type: string;
  isPrimary?: boolean;
  note?: string;
}

interface TableNode {
  name: string;
  columns: TableColumn[];
  headercolor?: string;
}

interface Relationship {
  from: string;
  to: string;
  type: ">" | "<" | "-" | "<>";
}

interface TableGroup {
  tables: string[];
  x: number;
  y: number;
}

interface DbmlFlowProps {
  dbml: string;
}

const parseDbml = (
  dbml: string
): {
  tables: TableNode[];
  relationships: Relationship[];
} => {
  const tables: TableNode[] = [];
  const relationships: Relationship[] = [];

  const lines = dbml.split("\n");
  let currentTable: TableNode | null = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    const tableLine = trimmedLine.match(
      /Table\s+(\w+)\s*(?:\[.*?headercolor:\s*([#\w]+).*?\])?/
    );
    if (tableLine) {
      currentTable = {
        name: tableLine[1],
        columns: [],
        headercolor: tableLine[2] || "#ff7225",
      };
      tables.push(currentTable);
    }

    const columnLine = trimmedLine.match(
      /^\s*(\w+)\s+([\w()]+)(?:\s+\[(.*?)\])?/
    );
    if (columnLine && currentTable) {
      const columnName = columnLine[1];
      const columnType = columnLine[2];
      const columnProps = columnLine[3] || "";

      const refMatch = columnProps.match(/ref:\s*([<>-])\s*(\w+)\.(\w+)/);
      if (refMatch) {
        const [, relationType, targetTable, targetColumn] = refMatch;
        relationships.push({
          from: `${currentTable.name}.${columnName}`,
          to: `${targetTable}.${targetColumn}`,
          type: relationType as ">" | "<" | "-",
        });
      }

      currentTable.columns.push({
        name: columnName,
        type: columnType,
        isPrimary: columnProps.includes("pk"),
        note: columnProps.match(/note:\s*"([^"]*)"/)?.[1],
      });
    }

    const refLine = trimmedLine.match(
      /Ref:\s*(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)/
    );
    if (refLine) {
      const [
        ,
        sourceTable,
        sourceColumn,
        relationType,
        targetTable,
        targetColumn,
      ] = refLine;
      relationships.push({
        from: `${sourceTable}.${sourceColumn}`,
        to: `${targetTable}.${targetColumn}`,
        type: relationType as ">" | "<" | "-" | "<>",
      });
    }
  });

  console.log("Parsed tables:", tables);
  console.log("Parsed relationships:", relationships);

  return { tables, relationships };
};

const TableNode = ({ data }: { data: TableNode }) => {
  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg bg-white"
      style={{ minWidth: 250 }}
    >
      <div
        className="px-4 py-2 text-white text-lg font-bold"
        style={{ backgroundColor: data.headercolor }}
      >
        {data.name}
      </div>
      <div className="bg-white">
        {data.columns.map((column, index) => (
          <div
            key={index}
            className="px-4 py-2 border-b flex justify-between items-center relative"
          >
            <div className="flex items-center">
              {/* 左侧连接点（作为目标） */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.name}-target`}
                style={{
                  background: "#555",
                  width: 8,
                  height: 8,
                  left: -4,
                }}
              />

              {column.isPrimary && (
                <span className="mr-2 text-yellow-500">🔑</span>
              )}
              <span>{column.name}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">{column.type}</span>
              {/* 右侧连接点（作为源） */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.name}-source`}
                style={{
                  background: "#555",
                  width: 8,
                  height: 8,
                  right: -4,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 将 nodeTypes 移到组件外部
const nodeTypes = {
  tableNode: TableNode,
};

export const DbmlFlow: React.FC<DbmlFlowProps> = ({ dbml }) => {
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [highlightedEdges, setHighlightedEdges] = React.useState<Set<string>>(
    new Set()
  );
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);

  // 将初始化逻辑移到单独的 useEffect 中，只依赖 dbml
  React.useEffect(() => {
    const { tables, relationships } = parseDbml(dbml);

    // 构建表之间的关系图
    const relationshipMap = new Map<string, Set<string>>();
    tables.forEach((table) => {
      relationshipMap.set(table.name, new Set());
    });

    relationships.forEach((rel) => {
      const [sourceTable] = rel.from.split(".");
      const [targetTable] = rel.to.split(".");
      relationshipMap.get(sourceTable)?.add(targetTable);
      relationshipMap.get(targetTable)?.add(sourceTable);
    });

    // 使用DFS找出相关联的表组
    const visited = new Set<string>();
    const groups: string[][] = [];

    const dfs = (tableName: string, currentGroup: string[]) => {
      visited.add(tableName);
      currentGroup.push(tableName);

      relationshipMap.get(tableName)?.forEach((relatedTable) => {
        if (!visited.has(relatedTable)) {
          dfs(relatedTable, currentGroup);
        }
      });
    };

    // 为每个未访问的表创建一个新组
    tables.forEach((table) => {
      if (!visited.has(table.name)) {
        const newGroup: string[] = [];
        dfs(table.name, newGroup);
        groups.push(newGroup);
      }
    });

    // 计算布局参数
    const NODE_WIDTH = 280;
    const NODE_HEIGHT = 300;
    const GROUP_SPACING_X = 200; // 增加组之间的水平间距
    const GROUP_SPACING_Y = 150; // 增加组之间的垂直间距
    const NODE_SPACING = 50; // 增加节点之间的间距
    const GRID_COLUMNS = 3; // 每行最多放置的组数

    // 计算每个组的布局
    const calculateGroupLayout = (group: string[]) => {
      const groupSize = group.length;
      let columns = Math.ceil(Math.sqrt(groupSize));
      let rows = Math.ceil(groupSize / columns);

      // 对于小组，优化列数
      if (groupSize <= 4) {
        columns = Math.min(2, groupSize);
        rows = Math.ceil(groupSize / columns);
      }

      return { columns, rows };
    };

    // 为每个组计算位置
    const groupPositions = groups
      .map((group, groupIndex) => {
        const { columns, rows } = calculateGroupLayout(group);
        const groupRow = Math.floor(groupIndex / GRID_COLUMNS);
        const groupCol = groupIndex % GRID_COLUMNS;

        // 计算组的起始位置
        const groupStartX = groupCol * (NODE_WIDTH * 3 + GROUP_SPACING_X);
        const groupStartY = groupRow * (NODE_HEIGHT * 3 + GROUP_SPACING_Y);

        return group.map((tableName, tableIndex) => {
          const row = Math.floor(tableIndex / columns);
          const col = tableIndex % columns;

          return {
            tableName,
            position: {
              x: groupStartX + col * (NODE_WIDTH + NODE_SPACING),
              y: groupStartY + row * (NODE_HEIGHT + NODE_SPACING),
            },
          };
        });
      })
      .flat();

    // 创建节点
    const initialNodes: Node[] = tables.map((table) => {
      const position = groupPositions.find(
        (pos) => pos.tableName === table.name
      )?.position || {
        x: 0,
        y: 0,
      };

      return {
        id: table.name,
        position,
        data: table,
        type: "tableNode",
        draggable: false,
      };
    });

    // 创建边
    const initialEdges: Edge[] = relationships.map((rel, index) => {
      const [sourceTable, sourceColumn] = rel.from.split(".");
      const [targetTable, targetColumn] = rel.to.split(".");

      const getMarkerEnd = (type: string) => {
        switch (type) {
          case ">":
            return { type: MarkerType.Arrow, width: 20, height: 20 };
          case "<":
            return { type: MarkerType.Arrow, width: 20, height: 20 };
          case "<>":
            return { type: MarkerType.ArrowClosed, width: 20, height: 20 };
          default:
            return { type: MarkerType.Arrow, width: 20, height: 20 };
        }
      };

      const getLabel = (type: string) => {
        switch (type) {
          case ">":
            return "(n) -> (1)";
          case "<":
            return "(1) -> (n)";
          case "<>":
            return "(n) -> (n)";
          default:
            return "(1) -> (1)";
        }
      };

      return {
        id: `edge-${index}`,
        source: sourceTable,
        target: targetTable,
        sourceHandle: `${sourceColumn}-source`,
        targetHandle: `${targetColumn}-target`,
        type: "smoothstep",
        animated: false,
        label: getLabel(rel.type),
        markerEnd: getMarkerEnd(rel.type),
        style: {
          strokeWidth: 2,
          stroke: "#b1b1b7",
        },
      };
    });

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [dbml]); // 只依赖 dbml

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // 移除节点点击事件，添加鼠标移入移出事件
  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const newHighlightedEdges = new Set<string>();
      edges.forEach((edge) => {
        if (edge.source === node.id || edge.target === node.id) {
          newHighlightedEdges.add(edge.id);
        }
      });
      setHighlightedEdges(newHighlightedEdges);
      setHoveredNode(node.id);
    },
    [edges]
  );

  const onNodeMouseLeave = useCallback(() => {
    setHighlightedEdges(new Set());
    setHoveredNode(null);
  }, []);

  // 使用 useMemo 来计算高亮样式
  const styledEdges = React.useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      animated: highlightedEdges.has(edge.id),
      style: {
        ...edge.style,
        strokeWidth: highlightedEdges.has(edge.id) ? 3 : 2,
        stroke: highlightedEdges.has(edge.id) ? "#ff3366" : "#b1b1b7",
      },
    }));
  }, [edges, highlightedEdges]);

  const styledNodes = React.useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: hoveredNode
          ? node.id === hoveredNode ||
            edges.some(
              (edge) =>
                (edge.source === node.id || edge.target === node.id) &&
                highlightedEdges.has(edge.id)
            )
            ? 1
            : 0.5
          : 1,
      },
    }));
  }, [nodes, edges, hoveredNode, highlightedEdges]);

  return (
    <div style={{ width: "100%", height: "1200px" }}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
        minZoom={0.1}
        maxZoom={4}
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.1,
          maxZoom: 1.5,
        }}
        deleteKeyCode={null}
        selectionKeyCode={null}
        nodesDraggable={false}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};
