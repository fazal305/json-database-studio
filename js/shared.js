(function () {
  "use strict";

  const STORAGE_KEY = "jsonDatabaseStudio.workspace";

  const defaultWorkspace = {
    settings: {
      compactSidebar: false,
      transitionSpeedMs: 320,
      defaultQueryPageSize: 25
    },
    theme: {
      bg: "#040712",
      bgSoft: "#07111f",
      card: "rgba(10, 18, 36, 0.9)",
      text: "#f7fbff",
      muted: "#9aabc7",
      primary: "#22d3ee",
      secondary: "#a855f7",
      success: "#4ade80",
      warning: "#facc15",
      danger: "#fb7185",
      radius: 18,
      fontFamily: "Inter, sans-serif"
    },
    database: {
      tables: [],
      indexes: [],
      relationships: []
    },
    queryHistory: [],
    activityLog: []
  };

  const navItems = [
    { page: "dashboard", href: "index.html", label: "Dashboard", icon: "DB" },
    { page: "tables", href: "tables.html", label: "Tables", icon: "TB" },
    { page: "indexes", href: "indexes.html", label: "Indexes", icon: "IX" },
    { page: "relationships", href: "relationships.html", label: "Relationships", icon: "ER" },
    { page: "query", href: "query.html", label: "Query Console", icon: "QL" },
    { page: "import-export", href: "import-export.html", label: "Import/Export", icon: "IO" },
    { page: "settings", href: "settings.html", label: "Settings", icon: "ST" }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function generateId(prefix) {
    const random = Math.random().toString(36).slice(2, 9);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
  }

  function formatTimestamp(dateString) {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  }

  function mergeWorkspace(input) {
    const base = clone(defaultWorkspace);
    const workspace = input && typeof input === "object" ? input : {};
    return {
      settings: { ...base.settings, ...(workspace.settings || {}) },
      theme: { ...base.theme, ...(workspace.theme || {}) },
      database: {
        tables: Array.isArray(workspace.database?.tables) ? workspace.database.tables : base.database.tables,
        indexes: Array.isArray(workspace.database?.indexes) ? workspace.database.indexes : base.database.indexes,
        relationships: Array.isArray(workspace.database?.relationships) ? workspace.database.relationships : base.database.relationships
      },
      queryHistory: Array.isArray(workspace.queryHistory) ? workspace.queryHistory : base.queryHistory,
      activityLog: Array.isArray(workspace.activityLog) ? workspace.activityLog : base.activityLog
    };
  }

  function loadWorkspace() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDemoData();
    try {
      const workspace = mergeWorkspace(JSON.parse(raw));
      saveWorkspace(workspace);
      return workspace;
    } catch (error) {
      console.warn("Workspace was unreadable, reseeding demo data.", error);
      return seedDemoData();
    }
  }

  function saveWorkspace(workspace) {
    const merged = mergeWorkspace(workspace);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  function resetWorkspace() {
    localStorage.removeItem(STORAGE_KEY);
    return seedDemoData();
  }

  function seedDemoData() {
    const createdAt = nowIso();
    const usersId = generateId("table");
    const productsId = generateId("table");
    const ordersId = generateId("table");

    const workspace = clone(defaultWorkspace);
    workspace.database.tables = [
      {
        id: usersId,
        name: "users",
        columns: [
          { id: generateId("col"), name: "id", type: "number", primaryKey: true, required: true, defaultValue: null },
          { id: generateId("col"), name: "name", type: "string", primaryKey: false, required: true, defaultValue: "" },
          { id: generateId("col"), name: "email", type: "string", primaryKey: false, required: true, defaultValue: "" },
          { id: generateId("col"), name: "age", type: "number", primaryKey: false, required: false, defaultValue: null },
          { id: generateId("col"), name: "isActive", type: "boolean", primaryKey: false, required: true, defaultValue: true }
        ],
        rows: [
          { _id: generateId("row"), id: 1, name: "Ali Khan", email: "ali@example.com", age: 31, isActive: true },
          { _id: generateId("row"), id: 2, name: "Sara Ahmed", email: "sara@example.com", age: 27, isActive: true },
          { _id: generateId("row"), id: 3, name: "Mina Patel", email: "mina@example.com", age: 42, isActive: false }
        ],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: productsId,
        name: "products",
        columns: [
          { id: generateId("col"), name: "id", type: "number", primaryKey: true, required: true, defaultValue: null },
          { id: generateId("col"), name: "name", type: "string", primaryKey: false, required: true, defaultValue: "" },
          { id: generateId("col"), name: "price", type: "number", primaryKey: false, required: true, defaultValue: 0 },
          { id: generateId("col"), name: "category", type: "string", primaryKey: false, required: true, defaultValue: "" }
        ],
        rows: [
          { _id: generateId("row"), id: 101, name: "Analytics Seat", price: 49, category: "software" },
          { _id: generateId("row"), id: 102, name: "Support Plan", price: 199, category: "service" },
          { _id: generateId("row"), id: 103, name: "Data Connector", price: 89, category: "integration" }
        ],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: ordersId,
        name: "orders",
        columns: [
          { id: generateId("col"), name: "id", type: "number", primaryKey: true, required: true, defaultValue: null },
          { id: generateId("col"), name: "userId", type: "number", primaryKey: false, required: true, defaultValue: null },
          { id: generateId("col"), name: "productId", type: "number", primaryKey: false, required: true, defaultValue: null },
          { id: generateId("col"), name: "quantity", type: "number", primaryKey: false, required: true, defaultValue: 1 },
          { id: generateId("col"), name: "orderDate", type: "date", primaryKey: false, required: true, defaultValue: "" }
        ],
        rows: [
          { _id: generateId("row"), id: 5001, userId: 1, productId: 101, quantity: 2, orderDate: "2026-06-12" },
          { _id: generateId("row"), id: 5002, userId: 2, productId: 102, quantity: 1, orderDate: "2026-06-19" },
          { _id: generateId("row"), id: 5003, userId: 1, productId: 103, quantity: 3, orderDate: "2026-07-01" }
        ],
        createdAt,
        updatedAt: createdAt
      }
    ];
    workspace.database.indexes = [
      { id: generateId("index"), tableId: usersId, columnName: "email", unique: true, createdAt },
      { id: generateId("index"), tableId: ordersId, columnName: "userId", unique: false, createdAt }
    ];
    workspace.database.relationships = [
      { id: generateId("rel"), name: "orders_users", fromTableId: ordersId, fromColumn: "userId", toTableId: usersId, toColumn: "id", type: "many-to-one", createdAt },
      { id: generateId("rel"), name: "orders_products", fromTableId: ordersId, fromColumn: "productId", toTableId: productsId, toColumn: "id", type: "many-to-one", createdAt }
    ];
    workspace.queryHistory = [
      { id: generateId("query"), queryText: "SELECT * FROM users WHERE age > 18 ORDER BY name ASC LIMIT 10", favorite: true, rowsReturned: 3, executionMs: 1.2, usedIndex: false, createdAt },
      { id: generateId("query"), queryText: "SELECT users.name, orders.quantity FROM users JOIN orders ON users.id = orders.userId WHERE orders.quantity >= 2", favorite: false, rowsReturned: 2, executionMs: 1.8, usedIndex: true, createdAt }
    ];
    workspace.activityLog = [
      { id: generateId("log"), module: "Tables", action: "Seeded demo tables", detail: "Created users, products, and orders tables", createdAt },
      { id: generateId("log"), module: "Indexes", action: "Seeded indexes", detail: "Created email and userId lookup indexes", createdAt },
      { id: generateId("log"), module: "Relationships", action: "Seeded relationships", detail: "Linked orders to users and products", createdAt }
    ];
    saveWorkspace(workspace);
    return workspace;
  }

  function addActivityLog(module, action, detail) {
    const workspace = loadWorkspace();
    workspace.activityLog.unshift({ id: generateId("log"), module, action, detail, createdAt: nowIso() });
    workspace.activityLog = workspace.activityLog.slice(0, 80);
    saveWorkspace(workspace);
  }

  function applyThemeSettings() {
    const workspace = loadWorkspace();
    const root = document.documentElement;
    Object.entries(workspace.theme).forEach(([key, value]) => {
      const cssName = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      root.style.setProperty(`--${cssName}`, key === "radius" ? `${value}px` : String(value));
    });
    root.style.setProperty("--overlay", workspace.theme.bg);
    root.style.setProperty("--transition-speed", `${workspace.settings.transitionSpeedMs}ms`);
    document.body.classList.toggle("compact-sidebar", Boolean(workspace.settings.compactSidebar));
  }

  function renderSidebar(activePage) {
    const current = activePage || document.body.dataset.page || "dashboard";
    const sidebarHtml = `
      <aside class="app-sidebar" id="appSidebar">
        <a class="brand" href="index.html" aria-label="JSON Database Studio home">
          <span class="brand-mark">JD</span>
          <span class="brand-text">
            <span class="brand-title">JSON Database Studio</span>
            <span class="brand-subtitle">Local JSON workspace</span>
          </span>
        </a>
        <nav class="sidebar-nav" aria-label="Primary">
          ${navItems.map((item) => `
            <a class="nav-link ${item.page === current ? "active" : ""}" href="${item.href}" data-page="${item.page}">
              <span class="nav-icon">${escapeHtml(item.icon)}</span>
              <span class="nav-label">${escapeHtml(item.label)}</span>
            </a>
          `).join("")}
        </nav>
        <div class="sidebar-footer">Data persists in this browser through localStorage.</div>
      </aside>`;
    const existing = document.querySelector(".app-sidebar");
    if (existing) existing.outerHTML = sidebarHtml;
    return sidebarHtml;
  }

  function setActiveNav() {
    const page = document.body.dataset.page || "dashboard";
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === page);
    });
  }

  function showStatus(message, type = "success") {
    let region = document.querySelector(".status-region");
    if (!region) {
      region = document.createElement("div");
      region.className = "status-region";
      document.body.appendChild(region);
    }
    const toast = document.createElement("div");
    toast.className = `status-toast ${type}`;
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function renderEmptyState(message) {
    return `<div class="empty-state"><p class="mb-0">${escapeHtml(message)}</p></div>`;
  }

  function downloadJson(filename, data) {
    downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json");
  }

  function downloadTextFile(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function copyText(text, message = "Copied to clipboard") {
    if (navigator.clipboard) {
      return navigator.clipboard.writeText(text).then(() => showStatus(message));
    }
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    showStatus(message);
    return Promise.resolve();
  }

  function slugify(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getTableById(database, id) {
    return database.tables.find((table) => table.id === id) || null;
  }

  function getTableByName(database, name) {
    return database.tables.find((table) => table.name.toLowerCase() === String(name).toLowerCase()) || null;
  }

  function castValue(type, value) {
    if (value === "" || value === undefined) return null;
    if (value === null) return null;
    if (type === "number") {
      const number = Number(value);
      return Number.isFinite(number) ? number : value;
    }
    if (type === "boolean") {
      if (typeof value === "boolean") return value;
      if (String(value).toLowerCase() === "true") return true;
      if (String(value).toLowerCase() === "false") return false;
      return value;
    }
    if (type === "date") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : String(value).slice(0, 10);
    }
    return String(value);
  }

  function validateRow(table, rowData) {
    const errors = [];
    const cleaned = { _id: rowData._id || generateId("row") };
    table.columns.forEach((column) => {
      const raw = rowData[column.name] ?? column.defaultValue;
      const value = castValue(column.type, raw);
      if (column.required && (value === null || value === "")) {
        errors.push(`${column.name} is required`);
      }
      if (value !== null && value !== "") {
        if (column.type === "number" && typeof value !== "number") errors.push(`${column.name} must be a number`);
        if (column.type === "boolean" && typeof value !== "boolean") errors.push(`${column.name} must be true or false`);
        if (column.type === "date" && Number.isNaN(new Date(value).getTime())) errors.push(`${column.name} must be a valid date`);
      }
      cleaned[column.name] = value;
    });
    return { valid: errors.length === 0, errors, row: cleaned };
  }

  function inferColumnType(value) {
    if (typeof value === "boolean" || /^(true|false)$/i.test(String(value))) return "boolean";
    if (value !== "" && value !== null && Number.isFinite(Number(value))) return "number";
    if (value && !Number.isNaN(new Date(value).getTime()) && /^\d{4}-\d{1,2}-\d{1,2}/.test(String(value))) return "date";
    return "string";
  }

  function buildIndexMap(table, columnName) {
    const map = new Map();
    (table?.rows || []).forEach((row) => {
      const key = row[columnName];
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    });
    return map;
  }

  function checkUniqueViolations(table, columnName) {
    const map = buildIndexMap(table, columnName);
    return Array.from(map.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([value, rows]) => ({ value, rows }));
  }

  function checkReferentialIntegrity(database) {
    const issues = [];
    database.relationships.forEach((relationship) => {
      const fromTable = getTableById(database, relationship.fromTableId);
      const toTable = getTableById(database, relationship.toTableId);
      if (!fromTable || !toTable) return;
      const targetValues = new Set(toTable.rows.map((row) => row[relationship.toColumn]));
      fromTable.rows.forEach((row) => {
        const value = row[relationship.fromColumn];
        if (value !== null && value !== "" && !targetValues.has(value)) {
          issues.push({ relationship, fromTable, toTable, row, value });
        }
      });
    });
    return issues;
  }

  function renderErDiagram(database, containerEl) {
    const tables = database.tables;
    if (!containerEl) return;
    if (!tables.length) {
      containerEl.innerHTML = renderEmptyState("Create tables to see the ER diagram.");
      return;
    }
    const columns = Math.ceil(Math.sqrt(tables.length));
    const boxWidth = 224;
    const xGap = 320;
    const yGap = 250;
    const positions = new Map();
    tables.forEach((table, index) => {
      positions.set(table.id, {
        x: 24 + (index % columns) * xGap,
        y: 24 + Math.floor(index / columns) * yGap
      });
    });
    const width = Math.max(820, columns * xGap + boxWidth);
    const height = Math.max(540, Math.ceil(tables.length / columns) * yGap + 220);
    const lines = database.relationships.map((relationship) => {
      const from = positions.get(relationship.fromTableId);
      const to = positions.get(relationship.toTableId);
      if (!from || !to) return "";
      const startX = from.x + boxWidth;
      const startY = from.y + 52;
      const endX = to.x;
      const endY = to.y + 52;
      const midX = (startX + endX) / 2;
      return `<path class="er-line" d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" />`;
    }).join("");
    const boxes = tables.map((table) => {
      const pos = positions.get(table.id);
      return `
        <button class="er-table" data-table-id="${table.id}" style="left:${pos.x}px;top:${pos.y}px" type="button">
          <div class="er-table-header">${escapeHtml(table.name)}</div>
          <div class="er-column-list">
            ${table.columns.map((column) => `
              <div class="er-column">
                <span>${escapeHtml(column.name)}</span>
                <span class="type-pill">${escapeHtml(column.type)}</span>
              </div>
            `).join("")}
          </div>
        </button>`;
    }).join("");
    containerEl.innerHTML = `
      <div class="er-canvas" style="width:${width}px;height:${height}px">
        <svg class="er-lines" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          <defs>
            <marker id="arrowHead" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
              <path d="M 0 0 L 10 4 L 0 8 z" fill="var(--primary)"></path>
            </marker>
          </defs>
          ${lines}
        </svg>
        ${boxes}
      </div>`;
  }

  function tokenizeQuery(queryText) {
    const tokens = [];
    let i = 0;
    while (i < queryText.length) {
      const char = queryText[i];
      if (/\s/.test(char)) {
        i += 1;
        continue;
      }
      if (char === "'" || char === '"') {
        const quote = char;
        let value = "";
        i += 1;
        while (i < queryText.length && queryText[i] !== quote) {
          value += queryText[i];
          i += 1;
        }
        if (queryText[i] !== quote) throw new Error("Unterminated string literal");
        i += 1;
        tokens.push({ type: "string", value });
        continue;
      }
      if (/[(),.*]/.test(char)) {
        tokens.push({ type: "symbol", value: char });
        i += 1;
        continue;
      }
      const two = queryText.slice(i, i + 2);
      if ([">=", "<=", "!="].includes(two)) {
        tokens.push({ type: "operator", value: two });
        i += 2;
        continue;
      }
      if (/[=<>]/.test(char)) {
        tokens.push({ type: "operator", value: char });
        i += 1;
        continue;
      }
      if (/[0-9]/.test(char)) {
        let value = char;
        i += 1;
        while (i < queryText.length && /[0-9.]/.test(queryText[i])) {
          value += queryText[i];
          i += 1;
        }
        tokens.push({ type: "number", value: Number(value) });
        continue;
      }
      if (/[A-Za-z_]/.test(char)) {
        let value = char;
        i += 1;
        while (i < queryText.length && /[A-Za-z0-9_.]/.test(queryText[i])) {
          value += queryText[i];
          i += 1;
        }
        const upper = value.toUpperCase();
        const keywords = ["SELECT", "FROM", "JOIN", "ON", "WHERE", "ORDER", "BY", "ASC", "DESC", "LIMIT", "AND", "OR", "LIKE"];
        tokens.push({ type: keywords.includes(upper) ? "keyword" : "identifier", value, upper });
        continue;
      }
      throw new Error(`Unexpected character '${char}'`);
    }
    return tokens;
  }

  function parseQuery(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const match = (value) => {
      const token = peek();
      if (token && String(token.value).toUpperCase() === value) {
        pos += 1;
        return token;
      }
      return null;
    };
    const consume = (value, message) => {
      const token = match(value);
      if (!token) throw new Error(message || `Expected ${value}`);
      return token;
    };
    const readIdentifier = (message) => {
      const token = peek();
      if (!token || !["identifier", "keyword"].includes(token.type)) throw new Error(message || "Expected identifier");
      pos += 1;
      return token.value;
    };
    const readColumnList = () => {
      if (match("*")) return ["*"];
      const columns = [];
      while (peek()) {
        columns.push(readIdentifier("Expected selected column"));
        if (!match(",")) break;
      }
      return columns;
    };
    const readValue = () => {
      const token = peek();
      if (!token) throw new Error("Expected comparison value");
      if (["string", "number"].includes(token.type)) {
        pos += 1;
        return token.value;
      }
      if (token.type === "identifier" || token.type === "keyword") {
        pos += 1;
        if (token.value.toLowerCase() === "true") return true;
        if (token.value.toLowerCase() === "false") return false;
        return token.value;
      }
      throw new Error("Expected comparison value");
    };
    const readCondition = () => {
      const conditions = [];
      const connectors = [];
      while (peek()) {
        const column = readIdentifier("Expected WHERE column");
        const operatorToken = peek();
        if (!operatorToken || !["operator", "keyword"].includes(operatorToken.type)) throw new Error("Expected WHERE operator");
        pos += 1;
        const operator = String(operatorToken.value).toUpperCase();
        if (!["=", "!=", ">", "<", ">=", "<=", "LIKE"].includes(operator)) throw new Error(`Unsupported operator ${operator}`);
        conditions.push({ column, operator, value: readValue() });
        if (match("AND")) connectors.push("AND");
        else if (match("OR")) connectors.push("OR");
        else break;
      }
      return { conditions, connectors };
    };

    consume("SELECT", "Query must start with SELECT");
    const columns = readColumnList();
    consume("FROM", "Expected FROM after selected columns");
    const from = readIdentifier("Expected table name after FROM");
    const joins = [];
    while (match("JOIN")) {
      const table = readIdentifier("Expected JOIN table name");
      consume("ON", "Expected ON after JOIN table");
      const left = readIdentifier("Expected left JOIN column");
      consume("=", "Expected = in JOIN condition");
      const right = readIdentifier("Expected right JOIN column");
      joins.push({ table, left, right });
    }
    let where = null;
    if (match("WHERE")) where = readCondition();
    let orderBy = null;
    if (match("ORDER")) {
      consume("BY", "Expected BY after ORDER");
      orderBy = { column: readIdentifier("Expected ORDER BY column"), direction: match("DESC") ? "DESC" : "ASC" };
      match("ASC");
    }
    let limit = null;
    if (match("LIMIT")) {
      const token = peek();
      if (!token || token.type !== "number") throw new Error("Expected numeric LIMIT");
      limit = token.value;
      pos += 1;
    }
    if (pos < tokens.length) throw new Error(`Unexpected token ${tokens[pos].value}`);
    return { columns, from, joins, where, orderBy, limit };
  }

  function rowValue(row, column) {
    if (Object.prototype.hasOwnProperty.call(row, column)) return row[column];
    const short = String(column).split(".").pop();
    return row[short];
  }

  function compareValues(left, operator, right) {
    if (operator === "LIKE") {
      const pattern = String(right).replace(/%/g, ".*");
      return new RegExp(`^${pattern}$`, "i").test(String(left ?? ""));
    }
    if (operator === "=") return left == right;
    if (operator === "!=") return left != right;
    if (operator === ">") return Number(left) > Number(right);
    if (operator === "<") return Number(left) < Number(right);
    if (operator === ">=") return Number(left) >= Number(right);
    if (operator === "<=") return Number(left) <= Number(right);
    return false;
  }

  function executeQuery(database, parsedQuery) {
    const started = performance.now();
    let rowsScanned = 0;
    let usedIndex = false;
    const fromTable = getTableByName(database, parsedQuery.from);
    if (!fromTable) throw new Error(`Table '${parsedQuery.from}' does not exist`);

    let rows = fromTable.rows.map((row) => {
      const output = {};
      Object.entries(row).forEach(([key, value]) => {
        output[key] = value;
        output[`${fromTable.name}.${key}`] = value;
      });
      return output;
    });

    parsedQuery.joins.forEach((join) => {
      const joinTable = getTableByName(database, join.table);
      if (!joinTable) throw new Error(`Join table '${join.table}' does not exist`);
      const joinedRows = [];
      rows.forEach((leftRow) => {
        joinTable.rows.forEach((rightRow) => {
          rowsScanned += 1;
          if (rowValue(leftRow, join.left) == rowValue(rightRow, join.right)) {
            const merged = { ...leftRow };
            Object.entries(rightRow).forEach(([key, value]) => {
              if (!Object.prototype.hasOwnProperty.call(merged, key)) merged[key] = value;
              merged[`${joinTable.name}.${key}`] = value;
            });
            joinedRows.push(merged);
          }
        });
      });
      rows = joinedRows;
    });

    if (parsedQuery.where?.conditions.length) {
      const first = parsedQuery.where.conditions[0];
      const indexed = database.indexes.find((index) => {
        const table = getTableById(database, index.tableId);
        return table?.name === fromTable.name && index.columnName === first.column && first.operator === "=";
      });
      if (indexed && !parsedQuery.joins.length) {
        usedIndex = true;
        const map = buildIndexMap(fromTable, indexed.columnName);
        rows = (map.get(first.value) || []).map((row) => {
          const output = {};
          Object.entries(row).forEach(([key, value]) => {
            output[key] = value;
            output[`${fromTable.name}.${key}`] = value;
          });
          return output;
        });
      }
      rows = rows.filter((row) => {
        rowsScanned += 1;
        const results = parsedQuery.where.conditions.map((condition) => compareValues(rowValue(row, condition.column), condition.operator, condition.value));
        return results.reduce((acc, result, index) => {
          const connector = parsedQuery.where.connectors[index - 1] || "AND";
          return connector === "OR" ? acc || result : acc && result;
        });
      });
    } else {
      rowsScanned += rows.length;
    }

    if (parsedQuery.orderBy) {
      const { column, direction } = parsedQuery.orderBy;
      rows.sort((a, b) => {
        const left = rowValue(a, column);
        const right = rowValue(b, column);
        if (left === right) return 0;
        const result = left > right ? 1 : -1;
        return direction === "DESC" ? result * -1 : result;
      });
    }

    if (Number.isFinite(parsedQuery.limit)) rows = rows.slice(0, parsedQuery.limit);

    const selected = parsedQuery.columns.includes("*")
      ? rows
      : rows.map((row) => {
        const output = {};
        parsedQuery.columns.forEach((column) => {
          output[column] = rowValue(row, column);
        });
        return output;
      });

    return {
      rows: selected,
      stats: {
        rowsScanned,
        usedIndex,
        executionMs: Number((performance.now() - started).toFixed(3))
      }
    };
  }

  function parseCsv(text) {
    const rows = [];
    let current = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        current.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        current.push(field);
        if (current.some((cell) => cell !== "")) rows.push(current);
        current = [];
        field = "";
      } else {
        field += char;
      }
    }
    current.push(field);
    if (current.some((cell) => cell !== "")) rows.push(current);
    if (!rows.length) return [];
    const headers = rows.shift().map(slugify);
    return rows.map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] ?? "";
      });
      return item;
    });
  }

  function rowsToCsv(table) {
    const headers = table.columns.map((column) => column.name);
    const escapeCell = (value) => {
      const text = String(value ?? "");
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [headers.join(",")];
    table.rows.forEach((row) => {
      lines.push(headers.map((header) => escapeCell(row[header])).join(","));
    });
    return lines.join("\n");
  }

  function ensureTransitionOverlay() {
    let overlay = document.querySelector(".transition-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "transition-overlay";
      overlay.innerHTML = `
        <div class="transition-overlay-content">
          <div class="transition-spinner" hidden></div>
          <div class="transition-message"></div>
        </div>`;
      document.body.prepend(overlay);
    }
    return overlay;
  }

  function showTransitionOverlay(withLoader = false) {
    const overlay = ensureTransitionOverlay();
    const spinner = overlay.querySelector(".transition-spinner");
    const message = overlay.querySelector(".transition-message");
    spinner.hidden = !withLoader;
    message.textContent = withLoader ? "Loading workspace..." : "";
    overlay.classList.remove("is-hidden");
  }

  function hideTransitionOverlay() {
    const overlay = ensureTransitionOverlay();
    window.setTimeout(() => overlay.classList.add("is-hidden"), 30);
  }

  function initPageTransitions() {
    applyThemeSettings();
    ensureTransitionOverlay();
    hideTransitionOverlay();
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link || link.target === "_blank" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.getAttribute("href"), window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      showTransitionOverlay(false);
      const workspace = loadWorkspace();
      const minDuration = Number(workspace.settings.transitionSpeedMs) || defaultWorkspace.settings.transitionSpeedMs;
      const loaderTimer = window.setTimeout(() => showTransitionOverlay(true), Math.max(80, minDuration / 2));
      window.setTimeout(() => {
        window.clearTimeout(loaderTimer);
        window.location.href = url.href;
      }, minDuration);
    });
  }

  window.JsonDbStudio = {
    STORAGE_KEY,
    defaultWorkspace,
    navItems,
    escapeHtml,
    generateId,
    formatTimestamp,
    loadWorkspace,
    saveWorkspace,
    resetWorkspace,
    seedDemoData,
    addActivityLog,
    applyThemeSettings,
    renderSidebar,
    setActiveNav,
    showStatus,
    renderEmptyState,
    downloadJson,
    downloadTextFile,
    copyText,
    slugify,
    getTableById,
    getTableByName,
    validateRow,
    inferColumnType,
    buildIndexMap,
    checkUniqueViolations,
    checkReferentialIntegrity,
    renderErDiagram,
    tokenizeQuery,
    parseQuery,
    executeQuery,
    parseCsv,
    rowsToCsv,
    initPageTransitions,
    showTransitionOverlay,
    hideTransitionOverlay
  };

  Object.assign(window, window.JsonDbStudio);
})();
