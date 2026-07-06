(function () {
  "use strict";

  let selectedTableId = null;
  let rowFilter = "";

  const tableTemplates = [
    {
      id: "users",
      name: "users",
      columns: [
        { name: "id", type: "number", primaryKey: true, required: true, defaultValue: null },
        { name: "name", type: "string", primaryKey: false, required: true, defaultValue: "" },
        { name: "email", type: "string", primaryKey: false, required: true, defaultValue: "" },
        { name: "age", type: "number", primaryKey: false, required: false, defaultValue: null },
        { name: "isActive", type: "boolean", primaryKey: false, required: true, defaultValue: true }
      ]
    },
    {
      id: "products",
      name: "products",
      columns: [
        { name: "id", type: "number", primaryKey: true, required: true, defaultValue: null },
        { name: "name", type: "string", primaryKey: false, required: true, defaultValue: "" },
        { name: "price", type: "number", primaryKey: false, required: true, defaultValue: 0 },
        { name: "category", type: "string", primaryKey: false, required: true, defaultValue: "" }
      ]
    },
    {
      id: "orders",
      name: "orders",
      columns: [
        { name: "id", type: "number", primaryKey: true, required: true, defaultValue: null },
        { name: "userId", type: "number", primaryKey: false, required: true, defaultValue: null },
        { name: "productId", type: "number", primaryKey: false, required: true, defaultValue: null },
        { name: "quantity", type: "number", primaryKey: false, required: true, defaultValue: 1 },
        { name: "orderDate", type: "date", primaryKey: false, required: true, defaultValue: "" }
      ]
    }
  ];

  function currentTable() {
    return getTableById(loadWorkspace().database, selectedTableId);
  }

  function persistTableChange(mutator, activity) {
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, selectedTableId);
    if (!table) return null;
    mutator(table, workspace);
    table.updatedAt = new Date().toISOString();
    if (activity) workspace.activityLog.unshift({ id: generateId("log"), module: "Tables", ...activity, createdAt: new Date().toISOString() });
    saveWorkspace(workspace);
    return table;
  }

  function renderTemplateSelect() {
    const select = document.getElementById("templateSelect");
    select.innerHTML = `<option value="">Starter template</option>${tableTemplates.map((template) => `<option value="${template.id}">${escapeHtml(template.name)}</option>`).join("")}`;
  }

  function renderTableList() {
    const workspace = loadWorkspace();
    const target = document.getElementById("tableList");
    const search = String(document.getElementById("tableSearchInput").value || "").toLowerCase();
    const tables = workspace.database.tables.filter((table) => table.name.toLowerCase().includes(search));
    if (!selectedTableId && workspace.database.tables[0]) selectedTableId = workspace.database.tables[0].id;
    if (!tables.length) {
      target.innerHTML = renderEmptyState("No matching tables.");
      return;
    }
    target.innerHTML = tables.map((table) => `
      <button class="table-list-item ${table.id === selectedTableId ? "active" : ""}" type="button" data-select-table="${table.id}">
        <strong>${escapeHtml(table.name)}</strong>
        <span class="muted small">${escapeHtml(formatTimestamp(table.updatedAt || table.createdAt))}</span>
        <span class="table-list-meta">
          <span class="chip">${table.columns.length} columns</span>
          <span class="chip">${table.rows.length} rows</span>
        </span>
      </button>
    `).join("");
  }

  function createTable() {
    const name = window.prompt("Table name");
    const slug = slugify(name);
    if (!slug) return;
    const workspace = loadWorkspace();
    if (getTableByName(workspace.database, slug)) {
      showStatus("A table with that name already exists.", "danger");
      return;
    }
    const now = new Date().toISOString();
    const table = {
      id: generateId("table"),
      name: slug,
      columns: [{ id: generateId("col"), name: "id", type: "number", primaryKey: true, required: true, defaultValue: null }],
      rows: [],
      createdAt: now,
      updatedAt: now
    };
    workspace.database.tables.push(table);
    workspace.activityLog.unshift({ id: generateId("log"), module: "Tables", action: "Created table", detail: `Created table '${slug}'`, createdAt: now });
    saveWorkspace(workspace);
    selectedTableId = table.id;
    renderAll();
    showStatus(`Created ${slug}`);
  }

  function addColumnToSchema(tableId) {
    selectedTableId = tableId || selectedTableId;
    persistTableChange((table) => {
      let base = "new_column";
      let name = base;
      let count = 2;
      while (table.columns.some((column) => column.name === name)) {
        name = `${base}_${count}`;
        count += 1;
      }
      table.columns.push({ id: generateId("col"), name, type: "string", primaryKey: false, required: false, defaultValue: "" });
      table.rows.forEach((row) => { row[name] = ""; });
    }, { action: "Added column", detail: "Added a new schema column" });
    renderAll();
  }

  function removeColumnFromSchema(tableId, columnId) {
    selectedTableId = tableId || selectedTableId;
    persistTableChange((table, workspace) => {
      const column = table.columns.find((item) => item.id === columnId);
      if (!column) return;
      table.columns = table.columns.filter((item) => item.id !== columnId);
      table.rows.forEach((row) => { delete row[column.name]; });
      workspace.database.indexes = workspace.database.indexes.filter((index) => !(index.tableId === table.id && index.columnName === column.name));
      workspace.database.relationships = workspace.database.relationships.filter((rel) => !((rel.fromTableId === table.id && rel.fromColumn === column.name) || (rel.toTableId === table.id && rel.toColumn === column.name)));
    }, { action: "Removed column", detail: "Removed a schema column and dependent links" });
    renderAll();
  }

  function updateColumnDefinition(tableId, columnId, field, value) {
    selectedTableId = tableId || selectedTableId;
    persistTableChange((table) => {
      const column = table.columns.find((item) => item.id === columnId);
      if (!column) return;
      if (field === "name") {
        const newName = slugify(value);
        if (!newName || table.columns.some((item) => item.id !== columnId && item.name === newName)) return;
        table.rows.forEach((row) => {
          row[newName] = row[column.name];
          delete row[column.name];
        });
        column.name = newName;
      } else if (field === "primaryKey" || field === "required") {
        column[field] = Boolean(value);
      } else if (field === "defaultValue") {
        column.defaultValue = castDefault(column.type, value);
      } else {
        column[field] = value;
      }
    }, { action: "Updated schema", detail: "Changed a column definition" });
    renderAll();
  }

  function castDefault(type, value) {
    if (value === "") return null;
    if (type === "number") return Number(value);
    if (type === "boolean") return value === true || value === "true";
    return value;
  }

  function deleteTable(id) {
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, id || selectedTableId);
    if (!table) return;
    const refs = workspace.database.indexes.filter((index) => index.tableId === table.id).length +
      workspace.database.relationships.filter((rel) => rel.fromTableId === table.id || rel.toTableId === table.id).length;
    if (!window.confirm(refs ? `Delete '${table.name}' and ${refs} dependent records?` : `Delete '${table.name}'?`)) return;
    workspace.database.tables = workspace.database.tables.filter((item) => item.id !== table.id);
    workspace.database.indexes = workspace.database.indexes.filter((index) => index.tableId !== table.id);
    workspace.database.relationships = workspace.database.relationships.filter((rel) => rel.fromTableId !== table.id && rel.toTableId !== table.id);
    workspace.activityLog.unshift({ id: generateId("log"), module: "Tables", action: "Deleted table", detail: `Deleted table '${table.name}'`, createdAt: new Date().toISOString() });
    saveWorkspace(workspace);
    selectedTableId = workspace.database.tables[0]?.id || null;
    renderAll();
    showStatus(`Deleted ${table.name}`, "warning");
  }

  function renderSchemaBuilder() {
    const table = currentTable();
    const title = document.getElementById("schemaTitle");
    const subtitle = document.getElementById("schemaSubtitle");
    const target = document.getElementById("schemaBuilder");
    if (!table) {
      title.textContent = "Schema Builder";
      subtitle.textContent = "Create a table to begin.";
      target.innerHTML = renderEmptyState("No table selected.");
      return;
    }
    title.textContent = `${table.name} schema`;
    subtitle.textContent = `${table.columns.length} columns, ${table.rows.length} rows`;
    target.innerHTML = table.columns.map((column, index) => `
      <div class="schema-row" data-column-id="${column.id}">
        <span class="drag-handle" title="Column order">${index + 1}</span>
        <label><span class="form-label">Name</span><input class="form-control" value="${escapeHtml(column.name)}" data-column-field="name"></label>
        <label><span class="form-label">Type</span><select class="form-select" data-column-field="type">
          ${["string", "number", "boolean", "date"].map((type) => `<option value="${type}" ${type === column.type ? "selected" : ""}>${type}</option>`).join("")}
        </select></label>
        <label class="form-check"><input class="form-check-input" type="checkbox" data-column-field="primaryKey" ${column.primaryKey ? "checked" : ""}> <span class="form-check-label">PK</span></label>
        <label class="form-check"><input class="form-check-input" type="checkbox" data-column-field="required" ${column.required ? "checked" : ""}> <span class="form-check-label">Required</span></label>
        <button class="btn btn-outline-danger btn-sm" type="button" data-remove-column="${column.id}">Remove</button>
      </div>
    `).join("");
  }

  function renderRowEditor() {
    const table = currentTable();
    const target = document.getElementById("rowEditor");
    if (!table) {
      target.innerHTML = "";
      return;
    }
    target.innerHTML = `
      <form id="addRowForm" class="row-editor-grid mb-3">
        ${table.columns.map((column) => `
          <label>
            <span class="form-label">${escapeHtml(column.name)} <span class="type-pill">${escapeHtml(column.type)}</span></span>
            ${column.type === "boolean"
              ? `<select class="form-select" name="${escapeHtml(column.name)}"><option value="">null</option><option value="true">true</option><option value="false">false</option></select>`
              : `<input class="form-control" name="${escapeHtml(column.name)}" type="${column.type === "date" ? "date" : "text"}" placeholder="${escapeHtml(String(column.defaultValue ?? ""))}">`}
          </label>
        `).join("")}
        <button class="btn btn-primary align-self-end" type="submit">Save Row</button>
      </form>`;
  }

  function filterRows(tableId, query) {
    const table = getTableById(loadWorkspace().database, tableId);
    if (!table) return [];
    const q = String(query || "").toLowerCase();
    if (!q) return table.rows;
    return table.rows.filter((row) => table.columns.some((column) => String(row[column.name] ?? "").toLowerCase().includes(q)));
  }

  function renderDataGrid(tableId) {
    selectedTableId = tableId || selectedTableId;
    const table = currentTable();
    const target = document.getElementById("dataGrid");
    if (!table) {
      target.innerHTML = renderEmptyState("Select a table to view rows.");
      return;
    }
    const rows = filterRows(table.id, rowFilter);
    if (!table.columns.length) {
      target.innerHTML = renderEmptyState("Add columns before entering rows.");
      return;
    }
    target.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join("")}<th>Actions</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr data-row-id="${row._id}">
              ${table.columns.map((column) => `<td><div class="editable-cell" contenteditable="true" data-cell="${escapeHtml(column.name)}">${escapeHtml(formatCell(row[column.name], column.type))}</div></td>`).join("")}
              <td><button class="btn btn-sm btn-outline-danger" type="button" data-delete-row="${row._id}">Delete</button></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function formatCell(value, type) {
    if (value === null || value === undefined) return "";
    if (type === "date") return String(value).slice(0, 10);
    return String(value);
  }

  function addRow(tableId, rowData) {
    selectedTableId = tableId || selectedTableId;
    const table = currentTable();
    if (!table) return;
    const validation = validateRow(table, rowData);
    if (!validation.valid) {
      showStatus(validation.errors.join("; "), "danger");
      return;
    }
    persistTableChange((target) => {
      target.rows.push(validation.row);
    }, { action: "Added row", detail: `Added a row to '${table.name}'` });
    renderAll();
    showStatus("Row added");
  }

  function editCell(tableId, rowId, columnName, value) {
    selectedTableId = tableId || selectedTableId;
    persistTableChange((table) => {
      const row = table.rows.find((item) => item._id === rowId);
      const column = table.columns.find((item) => item.name === columnName);
      if (!row || !column) return;
      const candidate = { ...row, [columnName]: value };
      const validation = validateRow(table, candidate);
      if (!validation.valid) {
        showStatus(validation.errors.join("; "), "danger");
        return;
      }
      Object.assign(row, validation.row);
    }, { action: "Edited cell", detail: `Updated '${columnName}' in '${currentTable()?.name || "table"}'` });
    renderAll();
  }

  function deleteRow(tableId, rowId) {
    selectedTableId = tableId || selectedTableId;
    persistTableChange((table) => {
      table.rows = table.rows.filter((row) => row._id !== rowId);
    }, { action: "Deleted row", detail: "Deleted a table row" });
    renderAll();
  }

  function applyTableTemplate(templateId) {
    const template = tableTemplates.find((item) => item.id === templateId);
    if (!template) return;
    const workspace = loadWorkspace();
    let name = template.name;
    let suffix = 2;
    while (getTableByName(workspace.database, name)) {
      name = `${template.name}_${suffix}`;
      suffix += 1;
    }
    const now = new Date().toISOString();
    const table = {
      id: generateId("table"),
      name,
      columns: template.columns.map((column) => ({ ...column, id: generateId("col") })),
      rows: [],
      createdAt: now,
      updatedAt: now
    };
    workspace.database.tables.push(table);
    workspace.activityLog.unshift({ id: generateId("log"), module: "Tables", action: "Applied template", detail: `Created '${name}' from the ${template.name} template`, createdAt: now });
    saveWorkspace(workspace);
    selectedTableId = table.id;
    renderAll();
    showStatus(`Template created ${name}`);
  }

  function renderAll() {
    renderTableList();
    renderSchemaBuilder();
    renderRowEditor();
    renderDataGrid(selectedTableId);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-sidebar-toggle]")) document.body.classList.toggle("sidebar-open");
      const tableButton = event.target.closest("[data-select-table]");
      if (tableButton) {
        selectedTableId = tableButton.dataset.selectTable;
        renderAll();
      }
      if (event.target.id === "createTableBtn") createTable();
      if (event.target.id === "addColumnBtn" && selectedTableId) addColumnToSchema(selectedTableId);
      if (event.target.id === "deleteTableBtn" && selectedTableId) deleteTable(selectedTableId);
      if (event.target.id === "applyTemplateBtn") applyTableTemplate(document.getElementById("templateSelect").value);
      const removeColumn = event.target.closest("[data-remove-column]");
      if (removeColumn) removeColumnFromSchema(selectedTableId, removeColumn.dataset.removeColumn);
      const deleteRowButton = event.target.closest("[data-delete-row]");
      if (deleteRowButton) deleteRow(selectedTableId, deleteRowButton.dataset.deleteRow);
    });

    document.addEventListener("change", (event) => {
      const field = event.target.closest("[data-column-field]");
      if (!field) return;
      const row = field.closest("[data-column-id]");
      const value = field.type === "checkbox" ? field.checked : field.value;
      updateColumnDefinition(selectedTableId, row.dataset.columnId, field.dataset.columnField, value);
    });

    document.addEventListener("blur", (event) => {
      const cell = event.target.closest("[data-cell]");
      if (cell) editCell(selectedTableId, cell.closest("[data-row-id]").dataset.rowId, cell.dataset.cell, cell.textContent.trim());
    }, true);

    document.getElementById("rowSearchInput").addEventListener("input", (event) => {
      rowFilter = event.target.value;
      renderDataGrid(selectedTableId);
    });
    document.getElementById("tableSearchInput").addEventListener("input", renderTableList);
    document.addEventListener("submit", (event) => {
      if (event.target.id !== "addRowForm") return;
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      addRow(selectedTableId, data);
      event.target.reset();
    });
  }

  function initTables() {
    initPageTransitions();
    document.getElementById("appSidebar").outerHTML = renderSidebar("tables");
    setActiveNav();
    const requested = new URLSearchParams(window.location.search).get("table");
    selectedTableId = requested || loadWorkspace().database.tables[0]?.id || null;
    renderTemplateSelect();
    renderAll();
    bindEvents();
  }

  window.renderTableList = renderTableList;
  window.createTable = createTable;
  window.addColumnToSchema = addColumnToSchema;
  window.removeColumnFromSchema = removeColumnFromSchema;
  window.updateColumnDefinition = updateColumnDefinition;
  window.deleteTable = deleteTable;
  window.renderDataGrid = renderDataGrid;
  window.addRow = addRow;
  window.editCell = editCell;
  window.deleteRow = deleteRow;
  window.filterRows = filterRows;
  window.applyTableTemplate = applyTableTemplate;

  document.addEventListener("DOMContentLoaded", initTables);
})();
