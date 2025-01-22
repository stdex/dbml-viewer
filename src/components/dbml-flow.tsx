import { Database } from "@/data/database";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import React, { useCallback } from "react";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  Controls,
  Edge,
  EdgeChange,
  Handle,
  MiniMap,
  Node,
  NodeChange,
  Position,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "../lib/utils";

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
  name: string;
  tables: { tableName: string; schemaName: string }[];
  color?: string;
}

interface DbmlFlowProps {
  database?: Database;
  className?: string;
}

// 添加网格配置常量
const GRID_SIZE = 20; // 网格大小

// 添加 ForceNode 接口定义
interface ForceNode {
  id: string;
  height: number;
  width: number;
  x?: number;
  y?: number;
  group?: string;
  isGroup?: boolean; // 添加标记以区分组节点
}

// 添加 ForceLink 接口定义
interface ForceLink {
  source: string;
  target: string;
  strength?: number;
}

// 在 parseDbml 函数之前添加新的力学布局函数
const applyForceLayout = (
  tables: TableNode[],
  relationships: Relationship[],
  groups: TableGroup[]
) => {
  // 修改 getGroupSize 函数
  const getGroupSize = (group: TableGroup) => {
    const groupTables = tables.filter((table) =>
      group.tables.some((t) => t.tableName === table.name)
    );

    const TABLE_WIDTH = 280;
    const PADDING = 80;

    // 计算总宽度（保持原来的计算方式）
    const tablesPerRow = Math.max(2, Math.ceil(Math.sqrt(groupTables.length)));
    const totalWidth = Math.max(
      800,
      TABLE_WIDTH * Math.min(tablesPerRow, groupTables.length) +
        (Math.min(tablesPerRow, groupTables.length) + 1) * PADDING
    );

    // 初始高度（用于力学布局）
    const initialHeight = Math.max(600, groupTables.length * 300);

    return {
      width: totalWidth + 100, // 保持原来的安全边距
      height: initialHeight, // 初始高度会在力学布局后被更新
    };
  };

  // 将表分类
  const groupedTables = new Map<string, TableNode[]>();
  const standaloneTables: TableNode[] = [];

  tables.forEach((table) => {
    const group = groups.find((g) =>
      g.tables.some((t) => t.tableName === table.name)
    );
    if (group) {
      if (!groupedTables.has(group.name)) {
        groupedTables.set(group.name, []);
      }
      groupedTables.get(group.name)!.push(table);
    } else {
      standaloneTables.push(table);
    }
  });

  // 存储所有节点的最终位置
  const nodePositions = new Map<string, { x: number; y: number }>();

  // 1. 首先计算每个组内部的布局
  groups.forEach((group) => {
    const groupTables = groupedTables.get(group.name) || [];
    if (groupTables.length === 0) return;

    // 创建组内表的力学节点
    const groupForceNodes: ForceNode[] = groupTables.map((table) => ({
      id: table.name,
      width: 280,
      height: 40 + table.columns.length * 40,
      x: Math.random() * 4000 - 2000, // 扩大初始分布范围
      y: Math.random() * 4000 - 2000,
      group: group.name,
    }));

    console.log(groupForceNodes);

    // 创建组内关系
    const groupForceLinks = relationships
      .filter((rel) => {
        const [fromTable] = rel.from.split(".");
        const [toTable] = rel.to.split(".");
        return (
          groupTables.some((t) => t.name === fromTable) &&
          groupTables.some((t) => t.name === toTable)
        );
      })
      .map((rel) => ({
        source: rel.from.split(".")[0],
        target: rel.to.split(".")[0],
        strength: 0.2,
      }));

    // 组内力学模拟
    const groupSimulation = forceSimulation<ForceNode>(groupForceNodes)
      // 大幅增加排斥力
      .force("charge", forceManyBody().strength(-6000))
      // 增加碰撞半径和强度
      .force("collide", forceCollide().radius(300).strength(1))
      // 修改连接力
      .force(
        "link",
        forceLink<ForceNode, ForceLink>(groupForceLinks)
          .id((d) => d.id)
          .distance(600) // 增加连接距离
          .strength(0.2) // 进一步减小连接强度
      )
      // 减小中心力
      .force("center", forceCenter(0, 0).strength(0.05))
      .stop();

    // 增加模拟次数以获得更稳定的布局
    for (let i = 0; i < 500; i++) {
      groupSimulation.tick();
    }

    // 保存组内节点位置（相对于组的中心点）
    groupForceNodes.forEach((node) => {
      nodePositions.set(node.id, { x: node.x || 0, y: node.y || 0 });
    });
  });

  // 2. 计算组和独立表的布局
  const topLevelNodes: ForceNode[] = [
    // 组节点
    ...groups.map((group) => {
      const size = getGroupSize(group);
      return {
        id: `group-${group.name}`,
        width: size.width,
        height: size.height,
        isGroup: true,
        x: Math.random() * 2000,
        y: Math.random() * 1000,
      };
    }),
    // 独立表节点
    ...standaloneTables.map((table) => ({
      id: table.name,
      width: 280,
      height: 40 + table.columns.length * 40,
      x: Math.random() * 2000,
      y: Math.random() * 1000,
    })),
  ];

  // 创建顶层关系连接
  const topLevelLinks = relationships
    .filter((rel) => {
      const [fromTable] = rel.from.split(".");
      const [toTable] = rel.to.split(".");
      const fromGroup = groups.find((g) =>
        g.tables.some((t) => t.tableName === fromTable)
      );
      const toGroup = groups.find((g) =>
        g.tables.some((t) => t.tableName === toTable)
      );
      return (
        (!fromGroup && !toGroup) || // 两个独立表之间
        (fromGroup && !toGroup) || // 组表到独立表
        (!fromGroup && toGroup) || // 独立表到组表
        (fromGroup && toGroup && fromGroup !== toGroup) // 不同组之间
      );
    })
    .map((rel) => {
      const [fromTable] = rel.from.split(".");
      const [toTable] = rel.to.split(".");
      const fromGroup = groups.find((g) =>
        g.tables.some((t) => t.tableName === fromTable)
      );
      const toGroup = groups.find((g) =>
        g.tables.some((t) => t.tableName === toTable)
      );

      return {
        source: fromGroup ? `group-${fromGroup.name}` : fromTable,
        target: toGroup ? `group-${toGroup.name}` : toTable,
        strength: 0.2,
      };
    });

  // 顶层力学模拟
  const topLevelSimulation = forceSimulation(topLevelNodes)
    // 调整排斥力，使用更合理的值
    .force("charge", forceManyBody().strength(-3000))
    // 增加碰撞检测的半径和强度
    .force(
      "collide",
      forceCollide()
        .radius((node: any) => {
          // 为组节点设置更大的碰撞半径，使用对角线长度作为半径
          if (node.isGroup) {
            const diagonal = Math.sqrt(
              Math.pow(node.width, 2) + Math.pow(node.height, 2)
            );
            // 增加碰撞半径，给予更多空间
            return diagonal * 0.5;
          }
          return 320;
        })
        .strength(1)
        .iterations(5) // 增加碰撞检测的迭代次数以获得更稳定的结果
    )
    // 调整 X/Y 方向的力，使分布更均匀
    .force("forceX", forceX().strength(0.2))
    .force("forceY", forceY().strength(0.2))
    .force(
      "link",
      forceLink(topLevelLinks)
        .id((d: any) => d.id)
        .distance((node) => {
          // 根据节点类型动态设置连接距离
          const source = topLevelNodes.find((n) => n.id === node.source);
          const target = topLevelNodes.find((n) => n.id === node.target);
          if (source?.isGroup && target?.isGroup) {
            // 增加组之间的距离
            return Math.max(
              1500,
              (source.width + target.width + source.height + target.height) / 2
            );
          }
          return 1000; // 增加其他节点之间的基础距离
        })
        .strength(0.05) // 进一步减小连接强度，让节点更自由地分布
    )
    // 调整布局中心点和范围
    .force("center", forceCenter(5000, 4000))
    .stop();

  // 增加预热阶段的初始温度
  topLevelSimulation.alpha(2);
  // 增加模拟迭代次数以获得更稳定的结果
  for (let i = 0; i < 2000; i++) {
    topLevelSimulation.tick();
  }

  // 保存顶层节点位置
  topLevelNodes.forEach((node) => {
    if (node.x !== undefined && node.y !== undefined) {
      nodePositions.set(node.id, { x: node.x, y: node.y });
    }
  });

  // 修改顶层力学模拟后的位置计算
  const finalPositions = new Map<string, { x: number; y: number }>();

  // 首先设置组的位置
  topLevelNodes.forEach((node) => {
    if (node.isGroup && node.x !== undefined && node.y !== undefined) {
      finalPositions.set(node.id, {
        x: node.x,
        y: node.y,
      });
    }
  });

  // 然后设置表的位置
  tables.forEach((table) => {
    const group = groups.find((g) =>
      g.tables.some((t) => t.tableName === table.name)
    );

    if (group) {
      // 如果表属于某个组
      const groupPos = finalPositions.get(`group-${group.name}`);
      const tableRelativePos = nodePositions.get(table.name);
      const groupSize = getGroupSize(group);

      if (groupPos && tableRelativePos) {
        const groupTables = tables.filter((t) =>
          group.tables.some((gt) => gt.tableName === t.name)
        );
        const tableIndex = groupTables.findIndex((t) => t.name === table.name);

        // 使用更扁平的布局
        const tablesPerRow = Math.max(
          2,
          Math.ceil(Math.sqrt(groupTables.length))
        );
        const rowIndex = Math.floor(tableIndex / tablesPerRow);
        const colIndex = tableIndex % tablesPerRow;

        const TABLE_WIDTH = 320;
        const PADDING = 80; // 增加内边距

        // 计算每行的起始位置，考虑该行表格的数量
        const tablesInThisRow = Math.min(
          tablesPerRow,
          groupTables.length - rowIndex * tablesPerRow
        );
        const rowWidth =
          tablesInThisRow * TABLE_WIDTH + (tablesInThisRow - 1) * PADDING;
        const startX = PADDING + (groupSize.width - rowWidth) / 2;

        // 计算当前行中所有表格的最大高度
        const currentRowTables = groupTables.slice(
          rowIndex * tablesPerRow,
          Math.min((rowIndex + 1) * tablesPerRow, groupTables.length)
        );
        const maxRowHeight = Math.max(
          ...currentRowTables.map((t) => 40 + t.columns.length * 40)
        );

        finalPositions.set(table.name, {
          x: startX + colIndex * (TABLE_WIDTH + PADDING),
          y: PADDING + rowIndex * (maxRowHeight + PADDING),
        });
      }
    } else {
      // 如果是独立表
      const pos = nodePositions.get(table.name);
      if (pos) {
        finalPositions.set(table.name, pos);
      }
    }
  });

  // 在力学布局完成后，计算每个组的实际所需高度
  const calculateFinalGroupHeight = (groupTables: TableNode[]) => {
    const PADDING = 80;
    const tablePositions = groupTables
      .map((table) => {
        const pos = finalPositions.get(table.name);
        if (!pos) return null;
        return {
          y: pos.y,
          height: 40 + table.columns.length * 40,
        };
      })
      .filter((pos): pos is NonNullable<typeof pos> => pos !== null);

    if (tablePositions.length === 0) {
      return 600; // 默认最小高度
    }

    // 找到最上和最下的边界
    const minY = Math.min(...tablePositions.map((pos) => pos.y));
    const maxY = Math.max(...tablePositions.map((pos) => pos.y + pos.height));

    // 添加padding和安全边距
    const SAFETY_MARGIN = 100;
    const totalHeight = maxY - minY + PADDING * 2 + SAFETY_MARGIN;

    // 确保最小高度
    return Math.max(600, totalHeight);
  };

  // 在力学布局完成后更新组的高度
  const finalGroupSizes = new Map(
    groups.map((group) => {
      const groupTables = tables.filter((table) =>
        group.tables.some((t) => t.tableName === table.name)
      );
      const initialSize = getGroupSize(group);
      return [
        group.name,
        {
          width: initialSize.width,
          height: calculateFinalGroupHeight(groupTables),
        },
      ];
    })
  );

  return {
    positions: finalPositions,
    groupSizes: finalGroupSizes,
  };
};

const parseDbml = (
  database: Database
): {
  tables: TableNode[];
  relationships: Relationship[];
  groups: TableGroup[];
} => {
  try {
    const tables: TableNode[] = database.schemas[0].tables.map((table) => ({
      name: table.name,
      columns: table.fields.map((field) => ({
        name: field.name,
        type: field.type.type_name,
        isPrimary: field.pk,
        note: field.note,
      })),
      headercolor: table.headerColor || "#ff7225",
    }));

    // 修改表组解析
    const groups: TableGroup[] =
      database.schemas[0].tableGroups?.map((group: any) => ({
        name: group.name,
        tables: group.tables.map((table: any) => ({
          tableName: table.tableName, // 直接使用表名字符串
          schemaName: table.schemaName || "public",
        })),
        color: group.color || "#ff7225", // 使用 group.color
      })) || [];

    const relationships: Relationship[] = database.schemas[0].refs.map(
      (ref) => {
        const [endpoint1, endpoint2] = ref.endpoints;

        // 确定关系类型
        let type: ">" | "<" | "-" | "<>";
        if (endpoint1.relation === "*" && endpoint2.relation === "1") {
          type = ">";
        } else if (endpoint1.relation === "1" && endpoint2.relation === "*") {
          type = "<";
        } else if (endpoint1.relation === "*" && endpoint2.relation === "*") {
          type = "<>";
        } else {
          type = "-";
        }

        return {
          from: `${endpoint1.tableName}.${endpoint1.fieldNames[0]}`,
          to: `${endpoint2.tableName}.${endpoint2.fieldNames[0]}`,
          type,
        };
      }
    );

    return { tables, relationships, groups };
  } catch (error) {
    console.error("Error parsing DBML:", error);
    return { tables: [], relationships: [], groups: [] };
  }
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
  columnsWithRelations?: Set<string>;
}

interface TableNodeProps {
  data: TableNodeData;
}

// 修改 TableNode 组件，添加 columnsWithRelations 属性
const TableNode = ({ data }: TableNodeProps) => {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("nodeId", data.name);
    event.stopPropagation();
  };

  return (
    <Tooltip.Provider>
      <div
        className="rounded-lg overflow-hidden shadow-lg bg-white"
        style={{
          minWidth: 250,
          position: "relative", // 添加相对定位
        }}
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
            <Tooltip.Root key={index}>
              <Tooltip.Trigger asChild>
                <div
                  className={cn(
                    "px-4 py-2 border-b flex justify-between items-center relative hover:bg-red-100 cursor-pointer",
                    data.highlightedColumns?.has(column.name)
                      ? "bg-red-100"
                      : ""
                  )}
                >
                  <div className="flex items-center">
                    {data.columnsWithRelations?.has(column.name) && (
                      <>
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={`${column.name}-target`}
                          style={{
                            background: "#cbd5e1",
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
                    <span className="text-gray-500 text-sm mr-2">
                      {column.type}
                    </span>
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
              </Tooltip.Trigger>
              {column.note && (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-lg bg-gray-800 px-4 py-2 text-sm text-white shadow-lg max-w-xs z-50"
                    sideOffset={5}
                    side="right"
                    align="center"
                  >
                    {column.note}
                    <Tooltip.Arrow className="fill-gray-800" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          ))}
        </div>
      </div>
    </Tooltip.Provider>
  );
};

// 添加 GroupNodeProps 接口
interface GroupNodeProps {
  data: TableGroup;
}

// 修改 GroupNode 组件
const GroupNode = ({ data }: GroupNodeProps) => {
  return (
    <div
      className="rounded-lg border border-dashed"
      style={{
        backgroundColor: `${data.color}12`,
        borderColor: data.color,
        minWidth: 500,
        height: "100%",
      }}
    >
      <div
        className="text-lg font-bold px-4 py-2 rounded"
        style={{
          backgroundColor: data.color,
          color: "white",
        }}
      >
        {data.name}
      </div>
    </div>
  );
};

// 将 nodeTypes 移到组件外部
const nodeTypes = {
  tableNode: TableNode,
  groupNode: GroupNode,
};

export const DbmlFlow: React.FC<DbmlFlowProps> = ({ database, className }) => {
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);
  const [highlightedEdges, setHighlightedEdges] = React.useState<Set<string>>(
    new Set()
  );
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [highlightedColumns, setHighlightedColumns] = React.useState<
    Map<string, Set<string>>
  >(new Map());
  const { fitView } = useReactFlow();

  // 将初始化逻辑移到单独的 useEffect 中，只依赖 dbml
  React.useEffect(() => {
    if (!database) return;
    const { tables, relationships, groups } = parseDbml(database);
    const { positions: nodePositions, groupSizes } = applyForceLayout(
      tables,
      relationships,
      groups
    );

    // 创建组节点
    const groupNodes: Node[] = groups.map((group) => {
      const groupPos = nodePositions.get(`group-${group.name}`);
      const size = groupSizes.get(group.name) || { width: 800, height: 600 };

      return {
        id: `group-${group.name}`,
        type: "groupNode",
        position: {
          x: groupPos?.x || Math.random() * 1000,
          y: groupPos?.y || Math.random() * 1000,
        },
        data: group,
        style: {
          width: size.width,
          height: size.height,
          zIndex: -1,
        },
        draggable: true,
        selectable: true,
      };
    });

    // 创建表节点
    const tableNodes: Node[] = tables.map((table) => {
      const pos = nodePositions.get(table.name);
      const parentGroup = groups.find((g) =>
        g.tables.some((t) => t.tableName === table.name)
      );

      return {
        id: table.name,
        type: "tableNode",
        position: {
          x: pos?.x || 0,
          y: pos?.y || 0,
        },
        data: {
          ...table,
          highlightedColumns: new Set(),
          columnsWithRelations: new Set(
            relationships
              .filter(
                (rel) =>
                  rel.from.startsWith(table.name) ||
                  rel.to.startsWith(table.name)
              )
              .flatMap((rel) => [rel.from.split(".")[1], rel.to.split(".")[1]])
          ),
        },
        parentNode: parentGroup ? `group-${parentGroup.name}` : undefined,
        extent: parentGroup ? "parent" : undefined,
        draggable: true,
        selectable: true,
      };
    });

    // 确保组节点先被添加，然后才是表节点
    setNodes([...groupNodes, ...tableNodes]);

    // 创建边
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
        style: {
          strokeWidth: 2,
          stroke: "#b1b1b7",
        },
      };
    });

    setEdges(initialEdges);

    // fit view
    setTimeout(() => {
      fitView({ duration: 1000 });
    }, 10);
  }, [database]); // 只依赖 dbml

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
    (_: React.MouseEvent, node: Node) => {
      // 如果是组节点，直接返回
      if (node.type === "groupNode") {
        return;
      }

      const newHighlightedEdges = new Set<string>();
      const newHighlightedColumns = new Map<string, Set<string>>();

      edges.forEach((edge) => {
        if (edge.source === node.id || edge.target === node.id) {
          newHighlightedEdges.add(edge.id);

          const sourceColumn =
            edge.sourceHandle
              ?.replace("-source", "")
              .replace("-left-source", "") || "";
          const targetColumn =
            edge.targetHandle
              ?.replace("-target", "")
              .replace("-right-target", "") || "";

          if (!newHighlightedColumns.has(edge.source)) {
            newHighlightedColumns.set(edge.source, new Set());
          }
          newHighlightedColumns.get(edge.source)?.add(sourceColumn);

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
          opacity: hoveredNode ? (isHighlighted ? 1 : 0.1) : 1,
        },
        labelStyle: {
          opacity: hoveredNode ? (isHighlighted ? 1 : 0.1) : 1,
          fill: isHighlighted ? "#ff3366" : "#666",
        },
      };
    });
  }, [edges, nodes, highlightedEdges, hoveredNode]);

  // 修改 styledNodes 的计算逻辑
  const styledNodes = React.useMemo(() => {
    return nodes.map((node) => {
      const isTable = node.type === "tableNode";
      const isGroup = node.type === "groupNode";

      const isRelated = hoveredNode
        ? node.id === hoveredNode ||
          (isTable &&
            edges.some(
              (edge) =>
                (edge.source === node.id || edge.target === node.id) &&
                highlightedEdges.has(edge.id)
            )) ||
          (isGroup &&
            nodes.some(
              (n) =>
                n.parentNode === node.id &&
                (n.id === hoveredNode ||
                  edges.some(
                    (edge) =>
                      (edge.source === n.id || edge.target === n.id) &&
                      highlightedEdges.has(edge.id)
                  ))
            ))
        : true;

      return {
        ...node,
        data: {
          ...node.data,
          highlightedColumns: highlightedColumns.get(node.id),
        },
        style: {
          ...node.style,
          opacity: isRelated ? 1 : 0.15,
          filter: isRelated ? "none" : "grayscale(80%)",
          backgroundColor: isGroup
            ? `${node.data.color}${isRelated ? "22" : "11"}`
            : undefined,
        },
      };
    });
  }, [nodes, edges, hoveredNode, highlightedEdges, highlightedColumns]);

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
    <div className={cn("w-full h-[calc(100vh-165px)]", className)}>
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
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background gap={GRID_SIZE} size={1} color="#ddd" />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
};
