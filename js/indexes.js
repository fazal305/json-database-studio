(function () {
  "use strict";

  function renderIndexList() {
    const workspace = loadWorkspace();
    const target = document.getElementById("indexList");
    const tables = workspace.database.tables;

    if (!workspace.database.indexes.length) {
      target.innerHTML = renderEmptyState("No indexes yet. Create one from the side panel.");
      return;
    }

    target.innerHTML = tables.map((table) => {
      const indexes = workspace.database.indexes.filter((index) => index.tableId === table.id);
      if (!indexes.length) return "";
      return `
        <div class="index-group">
          <h3 class="index-group-title">
            <span>${escapeHtml(table.name)}</span>
            <span class="chip">${indexes.length} indexes</span>
          </h3>
          ${indexes.map((index) => {
            const violations = index.unique ? checkUniqueViolations(table, index.columnName) : [];
            return `
              <article class="index-card">
                <div>
                  <p class="index-name">${escapeHtml(index.columnName)}</p>
                  <div class="table-list-meta">
                    <span class="chip ${index.unique ? "chip-primary" : ""}">${index.unique ? "unique" : "non-unique"}</span>
                    <span class="chip">${buildIndexMap(table, index.columnName).size} keys</span>
                    <span class="chip">${table.rows.length} rows</span>
                    ${violations.length ? `<span class="chip chip-danger">${violations.length} conflicts</span>` : ""}
                  </div>
                  <p class="mb-0 mt-2 muted small">Created ${escapeHtml(formatTimestamp(index.createdAt))}</p>
                </div>
                <button class="btn btn-sm btn-outline-danger" type="button" data-delete-index="${index.id}">Delete</button>
              </article>
            `;
          }).join("")}
        </div>
      `;
    }).join("") || renderEmptyState("No indexes are attached to existing tables.");
  }

  function renderCreateIndexControls() {
    const workspace = loadWorkspace();
    const tableSelect = document.getElementById("indexTableSelect");
    const selectedTableId = tableSelect.value || workspace.database.tables[0]?.id || "";

    tableSelect.innerHTML = workspace.database.tables.map((table) => `
      <option value="${table.id}" ${table.id === selectedTableId ? "selected" : ""}>${escapeHtml(table.name)}</option>
    `).join("");
    renderColumnSelect(selectedTableId);
  }

  function renderColumnSelect(tableId) {
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, tableId);
    const columnSelect = document.getElementById("indexColumnSelect");
    columnSelect.innerHTML = table
      ? table.columns.map((column) => `<option value="${escapeHtml(column.name)}">${escapeHtml(column.name)} (${escapeHtml(column.type)})</option>`).join("")
      : "";
    renderUniqueViolationWarning(tableId, columnSelect.value);
  }

  function renderLookupSelect() {
    const workspace = loadWorkspace();
    const select = document.getElementById("lookupIndexSelect");
    select.innerHTML = workspace.database.indexes.map((index) => {
      const table = getTableById(workspace.database, index.tableId);
      return table ? `<option value="${index.id}">${escapeHtml(table.name)}.${escapeHtml(index.columnName)}</option>` : "";
    }).join("");
  }

  function createIndex(tableId, columnName, unique) {
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, tableId);
    if (!table || !columnName) {
      showStatus("Choose a table and column first.", "danger");
      return;
    }
    if (workspace.database.indexes.some((index) => index.tableId === tableId && index.columnName === columnName)) {
      showStatus("That column is already indexed.", "warning");
      return;
    }
    const violations = unique ? checkUniqueViolations(table, columnName) : [];
    if (violations.length && !window.confirm(`This unique index has ${violations.length} duplicate value groups. Create it anyway?`)) return;

    workspace.database.indexes.push({ id: generateId("index"), tableId, columnName, unique: Boolean(unique), createdAt: new Date().toISOString() });
    workspace.activityLog.unshift({
      id: generateId("log"),
      module: "Indexes",
      action: "Created index",
      detail: `Created ${unique ? "unique" : "non-unique"} index on ${table.name}.${columnName}`,
      createdAt: new Date().toISOString()
    });
    saveWorkspace(workspace);
    showStatus(`Indexed ${table.name}.${columnName}`);
    renderAll();
  }

  function deleteIndex(id) {
    const workspace = loadWorkspace();
    const index = workspace.database.indexes.find((item) => item.id === id);
    if (!index) return;
    const table = getTableById(workspace.database, index.tableId);
    workspace.database.indexes = workspace.database.indexes.filter((item) => item.id !== id);
    workspace.activityLog.unshift({
      id: generateId("log"),
      module: "Indexes",
      action: "Deleted index",
      detail: `Deleted index on ${table?.name || "unknown"}.${index.columnName}`,
      createdAt: new Date().toISOString()
    });
    saveWorkspace(workspace);
    showStatus("Index deleted", "warning");
    renderAll();
  }

  function coerceLookupValue(table, columnName, value) {
    const column = table.columns.find((item) => item.name === columnName);
    if (!column) return value;
    if (column.type === "number") return Number(value);
    if (column.type === "boolean") return String(value).toLowerCase() === "true";
    if (column.type === "date") return String(value).slice(0, 10);
    return String(value);
  }

  function runLookupComparison(indexId, value) {
    const workspace = loadWorkspace();
    const index = workspace.database.indexes.find((item) => item.id === indexId);
    const table = index ? getTableById(workspace.database, index.tableId) : null;
    const target = document.getElementById("lookupResults");
    if (!index || !table) {
      target.innerHTML = renderEmptyState("Choose an index to compare.");
      return null;
    }

    const lookupValue = coerceLookupValue(table, index.columnName, value);
    const scanStart = performance.now();
    const scanRows = table.rows.filter((row) => row[index.columnName] === lookupValue);
    const scanMs = performance.now() - scanStart;

    const mapStart = performance.now();
    const indexMap = buildIndexMap(table, index.columnName);
    const indexedRows = indexMap.get(lookupValue) || [];
    const mapMs = performance.now() - mapStart;

    const result = {
      scanRows,
      indexedRows,
      scanMs: Number(scanMs.toFixed(4)),
      mapMs: Number(mapMs.toFixed(4)),
      lookupValue
    };

    target.innerHTML = `
      <div class="lookup-grid">
        <article class="timing-card">
          <p class="stat-label">Linear scan</p>
          <p class="timing-value">${result.scanMs} ms</p>
          <p class="stat-meta">${scanRows.length} rows found after scanning ${table.rows.length}</p>
        </article>
        <article class="timing-card">
          <p class="stat-label">Map lookup</p>
          <p class="timing-value">${result.mapMs} ms</p>
          <p class="stat-meta">${indexedRows.length} rows found from ${indexMap.size} indexed keys</p>
        </article>
      </div>
    `;
    return result;
  }

  function renderUniqueViolationWarning(tableId, columnName) {
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, tableId);
    const target = document.getElementById("uniqueWarning");
    if (!table || !columnName) {
      target.innerHTML = "";
      return;
    }
    const violations = checkUniqueViolations(table, columnName);
    if (!violations.length) {
      target.innerHTML = `<div class="mt-3 chip chip-success">No duplicate values detected</div>`;
      return;
    }
    target.innerHTML = `
      <div class="violation-list">
        ${violations.map((group) => `
          <div class="violation-item">
            <strong>${escapeHtml(columnName)} = ${escapeHtml(group.value)}</strong>
            <div class="small">${group.rows.length} conflicting rows: ${group.rows.map((row) => escapeHtml(row._id)).join(", ")}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-sidebar-toggle]")) document.body.classList.toggle("sidebar-open");
      const deleteButton = event.target.closest("[data-delete-index]");
      if (deleteButton) deleteIndex(deleteButton.dataset.deleteIndex);
    });

    document.getElementById("indexTableSelect").addEventListener("change", (event) => renderColumnSelect(event.target.value));
    document.getElementById("indexColumnSelect").addEventListener("change", (event) => {
      renderUniqueViolationWarning(document.getElementById("indexTableSelect").value, event.target.value);
    });

    document.getElementById("createIndexForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.target);
      createIndex(data.get("tableId"), data.get("columnName"), data.get("unique") === "on");
    });

    document.getElementById("lookupForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.target);
      runLookupComparison(data.get("indexId"), data.get("value"));
    });
  }

  function renderAll() {
    renderIndexList();
    renderCreateIndexControls();
    renderLookupSelect();
  }

  function initIndexes() {
    initPageTransitions();
    document.getElementById("appSidebar").outerHTML = renderSidebar("indexes");
    setActiveNav();
    renderAll();
    bindEvents();
  }

  window.renderIndexList = renderIndexList;
  window.createIndex = createIndex;
  window.deleteIndex = deleteIndex;
  window.runLookupComparison = runLookupComparison;
  window.renderUniqueViolationWarning = renderUniqueViolationWarning;

  document.addEventListener("DOMContentLoaded", initIndexes);
})();
