import React, { useEffect, useRef } from "react";
import { SVG } from "@svgdotjs/svg.js";
import "@svgdotjs/svg.panzoom.js";
import "@svgdotjs/svg.draggable.js";

interface SvgViewerProps {
  svgContent: string;
}

const SvgViewer: React.FC<SvgViewerProps> = ({ svgContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<any>(null);

  useEffect(() => {
    if (containerRef.current && svgContent) {
      // Clear previous content
      containerRef.current.innerHTML = "";

      // Create new SVG instance
      const draw = SVG().addTo(containerRef.current).size("100%", "100%");

      // Parse and add SVG content
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const svgElement = svgDoc.documentElement;

      // Get original viewBox
      const viewBox = svgElement.getAttribute("viewBox");
      if (viewBox) {
        draw.attr("viewBox", viewBox);
      }

      // Add all child nodes from the loaded SVG
      Array.from(svgElement.childNodes).forEach((node) => {
        draw.node.appendChild(node.cloneNode(true));
      });

      // Enable pan and zoom with updated settings
      draw.panZoom({
        zoomMin: 0.1,
        zoomMax: 10,
        zoomFactor: 0.05,
        panning: true,
        panButton: 2,
        oneFingerPan: true,
        margins: {
          top: 50,
          left: 50,
          right: 50,
          bottom: 50,
        },
      });

      // Store original positions of all edges
      const edgePositions = new Map();
      draw.find(".edge").each(function (this: any) {
        const path = this.findOne("path");
        if (path) {
          edgePositions.set(this.attr("id"), path.attr("d"));
        }
      });

      // Make nodes draggable
      draw.find(".node").each(function (this: any) {
        const node = this;
        let startX = 0;
        let startY = 0;

        this.draggable()
          .on("dragstart.namespace", function (e: any) {
            draw.panZoom({ panning: false });
            startX = e.detail.box.x;
            startY = e.detail.box.y;
            console.log("Drag start position:", startX, startY);
          })
          .on("dragend.namespace", function () {
            draw.panZoom({ panning: true });
          })
          .on("dragmove.namespace", function (e: any) {
            const nodeId = node.attr("id");
            const currentX = e.detail.box.x;
            const currentY = e.detail.box.y;
            const dx = currentX - startX;
            const dy = currentY - startY;

            console.log("Moving node:", nodeId);
            console.log("Movement delta:", dx, dy);

            // 查找所有的边
            draw.find("g.edge").each(function (this: any) {
              const edge = this;
              const title = edge.findOne("title");
              if (!title) return;

              const titleText = title.node.textContent;
              console.log("Edge title:", titleText);

              // 检查这条边是否连接到当前节点
              if (titleText && titleText.includes(nodeId)) {
                console.log("Found connected edge:", titleText);

                // 获取边的所有元素
                const path = edge.findOne("path");
                const polygon = edge.findOne("polygon"); // 箭头

                if (!path) {
                  console.log("Path not found");
                  return;
                }

                // 获取当前路径数据
                const pathData = path.node.getAttribute("d");
                console.log("Original path data:", pathData);

                // 将路径数据分割成坐标点
                const points = pathData
                  .split(/[MC]/)
                  .filter(Boolean)
                  .map((point: string) =>
                    point
                      .trim()
                      .split(/[\s,]+/)
                      .map(Number)
                  );
                console.log("Parsed points:", points);

                // 解析连接关系
                const [sourceWithPort, targetWithPort] = titleText
                  .split("->")
                  .map((s: string) => s.trim());

                // 提取节点ID和端口信息
                const source = sourceWithPort.split(":")[0];
                const target = targetWithPort.split(":")[0];

                console.log(
                  "Source:",
                  source,
                  "Target:",
                  target,
                  "NodeId:",
                  nodeId
                );

                if (source === nodeId) {
                  // 更新起点坐标
                  points[0][0] += dx;
                  points[0][1] += dy;

                  // 移动源节点端的所有文本元素
                  edge.find("text").each(function (this: any) {
                    const textElement = this.node;
                    const x = parseFloat(textElement.getAttribute("x") || "0");
                    const y = parseFloat(textElement.getAttribute("y") || "0");

                    // 计算文本元素到路径起点的距离
                    const distanceToStart = Math.hypot(
                      x - points[0][0],
                      y - points[0][1]
                    );
                    // 如果距离较近，则认为是源节点端的文本
                    if (distanceToStart < 100) {
                      // 可以根据实际情况调整这个阈值
                      textElement.setAttribute("x", String(x + dx));
                      textElement.setAttribute("y", String(y + dy));
                    }
                  });

                  // 如果箭头在源节点端，移动箭头
                  if (polygon) {
                    const polygonPoints = polygon.node
                      .getAttribute("points")
                      .split(" ");
                    const firstPoint = polygonPoints[0].split(",").map(Number);
                    const distanceToStart = Math.hypot(
                      firstPoint[0] - points[0][0],
                      firstPoint[1] - points[0][1]
                    );

                    if (distanceToStart < 100) {
                      // 箭头靠近起点
                      const newPoints = polygonPoints.map((p: string) => {
                        const [x, y] = p.split(",").map(Number);
                        return [x + dx, y + dy].join(",");
                      });
                      polygon.node.setAttribute("points", newPoints.join(" "));
                    }
                  }
                } else if (target === nodeId) {
                  // 更新终点坐标
                  const lastPoint = points[points.length - 1];
                  lastPoint[lastPoint.length - 2] += dx;
                  lastPoint[lastPoint.length - 1] += dy;

                  // 移动目标节点端的所有文本元素
                  edge.find("text").each(function (this: any) {
                    const textElement = this.node;
                    const x = parseFloat(textElement.getAttribute("x") || "0");
                    const y = parseFloat(textElement.getAttribute("y") || "0");

                    // 计算文本元素到路径终点的距离
                    const distanceToEnd = Math.hypot(
                      x - lastPoint[lastPoint.length - 2],
                      y - lastPoint[lastPoint.length - 1]
                    );
                    // 如果距离较近，则认为是目标节点端的文本
                    if (distanceToEnd < 100) {
                      // 可以根据实际情况调整这个阈值
                      textElement.setAttribute("x", String(x + dx));
                      textElement.setAttribute("y", String(y + dy));
                    }
                  });

                  // 如果箭头在目标节点端，移动箭头
                  if (polygon) {
                    const polygonPoints = polygon.node
                      .getAttribute("points")
                      .split(" ");
                    const firstPoint = polygonPoints[0].split(",").map(Number);
                    const distanceToEnd = Math.hypot(
                      firstPoint[0] - lastPoint[lastPoint.length - 2],
                      firstPoint[1] - lastPoint[lastPoint.length - 1]
                    );

                    if (distanceToEnd < 100) {
                      // 箭头靠近终点
                      const newPoints = polygonPoints.map((p: string) => {
                        const [x, y] = p.split(",").map(Number);
                        return [x + dx, y + dy].join(",");
                      });
                      polygon.node.setAttribute("points", newPoints.join(" "));
                    }
                  }
                }

                // 重建路径数据
                const newPathData = `M${points[0].join(",")}C${points[1].join(
                  ","
                )}`;
                console.log("New path data:", newPathData);

                // 直接设置路径的 d 属性
                path.node.setAttribute("d", newPathData);
              }
            });

            // 更新起始位置
            startX = currentX;
            startY = currentY;
          });
      });

      svgRef.current = draw;
    }

    return () => {
      if (svgRef.current) {
        svgRef.current.remove();
      }
    };
  }, [svgContent]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded-lg shadow-lg"
      style={{ minHeight: "500px" }}
    />
  );
};

// Helper function to translate the start point of a path
function translatePathStart(pathD: string, dx: number, dy: number): string {
  console.log("Original path:", pathD);
  const commands = pathD.split(/(?=[MLHVCSQTAZmlhvcsqtaz])/);
  if (commands.length > 0) {
    const firstCommand = commands[0];
    const type = firstCommand[0];
    const coords = firstCommand
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (type === "M" || type === "m") {
      coords[0] += dx;
      coords[1] += dy;
      commands[0] = `${type}${coords.join(",")}`;
      console.log("Updated start command:", commands[0]);
    }
  }
  const result = commands.join("");
  console.log("New path:", result);
  return result;
}

// Helper function to translate the end point of a path
function translatePathEnd(pathD: string, dx: number, dy: number): string {
  console.log("Original path:", pathD);
  const commands = pathD.split(/(?=[MLHVCSQTAZmlhvcsqtaz])/);
  if (commands.length > 0) {
    const lastCommand = commands[commands.length - 1];
    const type = lastCommand[0];
    const coords = lastCommand
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    const lastIndex = coords.length - 2;
    coords[lastIndex] += dx;
    coords[lastIndex + 1] += dy;
    commands[commands.length - 1] = `${type}${coords.join(",")}`;
    console.log("Updated end command:", commands[commands.length - 1]);
  }
  const result = commands.join("");
  console.log("New path:", result);
  return result;
}

export default SvgViewer;
