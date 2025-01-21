import React, { useCallback, useState } from "react";
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

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

// 添加网格配置常量
const GRID_SIZE = 20; // 网格大小
const SNAP_THRESHOLD = 10; // 吸附阈值

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

// 添加一个辅助函数来决定 handle 位置
const getHandlePosition = (
  sourceNodeId: string,
  targetNodeId: string,
  nodes: Node[]
) => {
  const sourceNode = nodes.find((n) => n.id === sourceNodeId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);

  if (!sourceNode || !targetNode)
    return { source: Position.Right, target: Position.Left };

  // 比较节点的 x 坐标来决定连接点位置
  if (sourceNode.position.x < targetNode.position.x) {
    return { source: Position.Right, target: Position.Left };
  } else {
    return { source: Position.Left, target: Position.Right };
  }
};

// 修改 TableNode 组件的数据结构
interface TableNodeData extends TableNode {
  highlightedColumns?: Set<string>;
  columnsWithRelations?: Set<string>; // 新增：用于跟踪有关系的列
}

interface TableNodeProps {
  data: TableNodeData; // 使用新的接口
}

// 修改 TableNode 组件，添加 columnsWithRelations 属性
const TableNode = ({ data }: TableNodeProps) => {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("nodeId", data.name);
    event.stopPropagation();
  };

  return (
    <div
      className="rounded-lg overflow-hidden shadow-lg bg-white"
      style={{ minWidth: 250 }}
      draggable
      onDragStart={handleDragStart}
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
            className="px-4 py-2 border-b flex justify-between items-center relative hover:bg-gray-50"
            style={{
              backgroundColor: data.highlightedColumns?.has(column.name)
                ? "rgba(255, 51, 102, 0.1)"
                : "transparent",
              transition: "background-color 0.2s ease",
            }}
          >
            <div className="flex items-center">
              {/* 只在有关系的列上显示 handle */}
              {data.columnsWithRelations?.has(column.name) && (
                <>
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${column.name}-target`}
                    style={{
                      background: "#cbd5e1", // 更柔和的颜色
                      width: 6,
                      height: 6,
                      left: -3,
                    }}
                  />
                  <Handle
                    type="source"
                    position={Position.Left}
                    id={`${column.name}-left-source`}
                    style={{
                      background: "#cbd5e1",
                      width: 6,
                      height: 6,
                      left: -3,
                    }}
                  />
                </>
              )}
              {column.isPrimary && (
                <span className="mr-2 text-yellow-500">🔑</span>
              )}
              <span>{column.name}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-500 text-sm mr-2">{column.type}</span>
              {/* 只在有关系的列上显示 handle */}
              {data.columnsWithRelations?.has(column.name) && (
                <>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${column.name}-source`}
                    style={{
                      background: "#cbd5e1",
                      width: 6,
                      height: 6,
                      right: -3,
                    }}
                  />
                  <Handle
                    type="target"
                    position={Position.Right}
                    id={`${column.name}-right-target`}
                    style={{
                      background: "#cbd5e1",
                      width: 6,
                      height: 6,
                      right: -3,
                    }}
                  />
                </>
              )}
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
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const [highlightedColumns, setHighlightedColumns] = React.useState<
    Map<string, Set<string>>
  >(new Map());

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

    // 创建一个 Map 来跟踪有关系的列
    const columnsWithRelations = new Map<string, Set<string>>();

    // 初始化 Map
    tables.forEach((table) => {
      columnsWithRelations.set(table.name, new Set());
    });

    // 收集所有有关系的列
    relationships.forEach((rel) => {
      const [sourceTable, sourceColumn] = rel.from.split(".");
      const [targetTable, targetColumn] = rel.to.split(".");

      columnsWithRelations.get(sourceTable)?.add(sourceColumn);
      columnsWithRelations.get(targetTable)?.add(targetColumn);
    });

    // 创建节点时包含 columnsWithRelations 信息
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
        data: {
          ...table,
          highlightedColumns: new Set(),
          columnsWithRelations: columnsWithRelations.get(table.name),
        },
        type: "tableNode",
        draggable: false,
      };
    });

    // 修改创建边的部分，移除箭头
    const initialEdges: Edge[] = relationships.map((rel, index) => {
      const [sourceTable, sourceColumn] = rel.from.split(".");
      const [targetTable, targetColumn] = rel.to.split(".");

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
        // 移除 markerEnd
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

  // 修改 onNodeMouseEnter
  const onNodeMouseEnter = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const newHighlightedEdges = new Set<string>();
      const newHighlightedColumns = new Map<string, Set<string>>();

      edges.forEach((edge) => {
        if (edge.source === node.id || edge.target === node.id) {
          newHighlightedEdges.add(edge.id);

          // 获取源列和目标列（修正列名提取）
          const sourceColumn =
            edge.sourceHandle
              ?.replace("-source", "")
              .replace("-left-source", "") || "";
          const targetColumn =
            edge.targetHandle
              ?.replace("-target", "")
              .replace("-right-target", "") || "";

          // 为源节点添加高亮列
          if (!newHighlightedColumns.has(edge.source)) {
            newHighlightedColumns.set(edge.source, new Set());
          }
          newHighlightedColumns.get(edge.source)?.add(sourceColumn);

          // 为目标节点添加高亮列
          if (!newHighlightedColumns.has(edge.target)) {
            newHighlightedColumns.set(edge.target, new Set());
          }
          newHighlightedColumns.get(edge.target)?.add(targetColumn);
        }
      });

      setHighlightedEdges(newHighlightedEdges);
      setHighlightedColumns(newHighlightedColumns);
      setHoveredNode(node.id);
    },
    [edges]
  );

  // 修改 onNodeMouseLeave
  const onNodeMouseLeave = useCallback(() => {
    setHighlightedEdges(new Set());
    setHighlightedColumns(new Map());
    setHoveredNode(null);
  }, []);

  // 修改 styledEdges 的计算逻辑
  const styledEdges = React.useMemo(() => {
    return edges.map((edge) => {
      const { source, target } = edge;
      const handlePositions = getHandlePosition(source, target, nodes);
      const isHighlighted = highlightedEdges.has(edge.id);

      // 获取列名部分
      const sourceColumn = edge.sourceHandle?.replace("-source", "") || "";
      const targetColumn = edge.targetHandle?.replace("-target", "") || "";

      return {
        ...edge,
        sourceHandle: `${sourceColumn}-${
          handlePositions.source === Position.Right ? "source" : "left-source"
        }`,
        targetHandle: `${targetColumn}-${
          handlePositions.target === Position.Left ? "target" : "right-target"
        }`,
        animated: isHighlighted,
        style: {
          ...edge.style,
          strokeWidth: isHighlighted ? 3 : 2,
          stroke: isHighlighted ? "#ff3366" : "#b1b1b7",
          opacity: hoveredNode ? (isHighlighted ? 1 : 0.1) : 1, // 降低非高亮边的透明度
        },
        labelStyle: {
          opacity: hoveredNode ? (isHighlighted ? 1 : 0.1) : 1, // 标签透明度跟随边
          fill: isHighlighted ? "#ff3366" : "#666",
        },
      };
    });
  }, [edges, nodes, highlightedEdges, hoveredNode]);

  // 修改 styledNodes 的计算逻辑
  const styledNodes = React.useMemo(() => {
    return nodes.map((node) => {
      const isRelated = hoveredNode
        ? node.id === hoveredNode ||
          edges.some(
            (edge) =>
              (edge.source === node.id || edge.target === node.id) &&
              highlightedEdges.has(edge.id)
          )
        : true;

      return {
        ...node,
        draggable: true,
        type: "tableNode",
        data: {
          ...node.data,
          highlightedColumns: highlightedColumns.get(node.id),
        },
        style: {
          ...node.style,
          cursor: "move",
          opacity: isRelated ? 1 : 0.15, // 降低透明度
          filter: isRelated ? "none" : "grayscale(80%)", // 添加灰度效果
        },
      };
    });
  }, [nodes, edges, hoveredNode, highlightedEdges, highlightedColumns]);

  const handleDragStart = (event: React.DragEvent, nodeId: string) => {
    event.dataTransfer.setData("nodeId", nodeId);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // 添加网格对齐函数
  const snapToGrid = (x: number, y: number) => {
    const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    return { x: snappedX, y: snappedY };
  };

  // 修改 handleDrop 函数
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData("nodeId");

    // 获取 ReactFlow 容器的位置
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();

    // 计算相对于容器的位置
    const x = event.clientX - reactFlowBounds.left;
    const y = event.clientY - reactFlowBounds.top;

    // 应用网格对齐
    const { x: snappedX, y: snappedY } = snapToGrid(x, y);

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            position: {
              x: snappedX,
              y: snappedY,
            },
          };
        }
        return node;
      })
    );
  };

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
        nodesDraggable={true}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        snapToGrid={true}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
      >
        <Background gap={GRID_SIZE} size={1} color="#ddd" />
        <Controls />
      </ReactFlow>
    </div>
  );
};
