import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Database } from "./database";

interface DatabaseState {
  database: Database | undefined;
  setDatabase: (database: Database) => void;
  getDatabase: () => Database | undefined;
  // 获取表，以及与它有关系的表数据
  getTable: (schema: string, table: string) => Database | undefined;
}

export const useDatabaseStore = create<DatabaseState>()(
  immer((set, get) => ({
    database: (() => {
      const database = localStorage.getItem("database");
      if (!database) return undefined;
      return JSON.parse(database);
    })(),
    setDatabase: (database: Database) => {
      localStorage.setItem("database", JSON.stringify(database));
      set((state) => {
        state.database = database;
      });
    },
    getDatabase: () => get().database,
    getTable: (schema: string, table: string): Database | undefined => {
      const database = get().database;
      if (!database) return undefined;
      const sc = database.schemas.find((s) => s.name === schema);
      if (!sc) return undefined;
      const targetTable = sc.tables.find((t) => t.name === table);
      if (!targetTable) return undefined;

      // 修正：处理 schemaName 为 null 的情况
      const relatedRefs = sc.refs.filter((ref) =>
        ref.endpoints.some(
          (endpoint) =>
            // 默认 schemaName 为当前 schema（若为 null）
            (endpoint.schemaName === schema || endpoint.schemaName === null) &&
            endpoint.tableName === table
        )
      );

      // 收集所有相关表的表名和模式名
      const relatedTables = new Set<string>();
      relatedRefs.forEach((ref) => {
        ref.endpoints.forEach((endpoint) => {
          // 若 schemaName 为 null，使用当前 schema 名称
          const endpointSchema = endpoint.schemaName || schema;
          relatedTables.add(`${endpointSchema}.${endpoint.tableName}`);
        });
      });

      // 构建包含相关表的数据库结构
      const relatedSchemas = database.schemas
        .map((schema) => ({
          ...schema,
          tables: schema.tables.filter(
            (t) =>
              relatedTables.has(`${schema.name}.${t.name}`) ||
              (schema.name === sc.name && t.name === table)
          ),
          refs: relatedRefs,
          tableGroups: [],
        }))
        .filter((schema) => schema.tables.length > 0);

      return {
        schemas: relatedSchemas,
        notes: database.notes,
      };
    },
  }))
);
