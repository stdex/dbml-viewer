export type Table = {
  name: string;
  alias: string;
  note: string;
  headerColor: string;
  fields: Field[];
  indexes: {
    columns: {
      type: any;
      value: any;
    }[];
  }[];
};

export type Field = {
  name: string;
  type: any;
  unique: boolean;
  pk: boolean;
  not_null: boolean;
  note: string;
};

export type Enum = {
  values: {
    name: string;
    note: string;
  }[];
  name: string;
  note: string;
};

export type TableGroup = {
  tables: {
    tableName: string;
    schemaName: string;
  }[];
  name: string;
  color?: string;
};

export type Ref = {
  endpoints: {
    schemaName: string;
    tableName: string;
    fieldNames: string[];
    relation: any;
  }[];
  name: string;
  onDelete: any;
  onUpdate: any;
};

export type Schema = {
  tables: Table[];
  enums: Enum[];
  tableGroups: TableGroup[];
  refs: Ref[];
  name: string;
};

export type Note = {
  id: number;
  name: string;
  content: string;
  headerColor: string;
};

export type Database = {
  schemas: Schema[];
  notes: Note[];
};
