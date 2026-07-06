(function () {
  "use strict";

  let importMode = "json";
  let previewRows = [];

  function renderTableSelects() {
    const workspace = loadWorkspace();
    const tableOptions = [`<option value="">Create new table</option>`].concat(workspace.database.tables.map((table) => `<option value="${table.id}">${escapeHtml(table.name)}</option>`)).join("");
    document.getElementById("targetTableSelect").innerHTML = tableOptions;
    document.getElementById("exportTableSelect").innerHTML = workspace.database.tables.map((table) => `<option value="${table.id}">${escapeHtml(table.name)}</option>`).join("");
  }

  function inferColumns(rows) {
    const names = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(slugify(key)));
      return set;
    }, new Set()));
    return names.map((name) => {
      const sample = rows.map((row) => row[name]).find((value) => value !== "" && value !== null && value !== undefined);
      return { id: generateId("col"), name, type: inferColumnType(sample), primaryKey: false, required: false, defaultValue: null };
    });
  }

  function normalizeRows(rows) {
    return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [slugify(key), value])));
  }

  function parseJsonRows(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.rows)) return parsed.rows;
    if (typeof parsed === "object" && parsed !== null) return [parsed];
    throw new Error("JSON import must be an object, an array, or an object with rows.");
  }

  function commitRows(rows, targetTableId, newTableName, moduleName) {
    const workspace = loadWorkspace();
    const cleanRows = normalizeRows(rows);
    if (!cleanRows.length) throw new Error("No rows found to import.");
    let table = getTableById(workspace.database, targetTableId);
    const now = new Date().toISOString();
    if (!table) {
      const name = slugify(newTableName) || `imported_${Date.now().toString(36)}`;
      table = { id: generateId("table"), name, columns: inferColumns(cleanRows), rows: [], createdAt: now, updatedAt: now };
      workspace.database.tables.push(table);
    }
    cleanRows.forEach((row) => {
      const validation = validateRow(table, row);
      if (validation.valid) table.rows.push(validation.row);
      else table.rows.push({ _id: generateId("row"), ...row });
    });
    table.updatedAt = now;
    workspace.activityLog.unshift({ id: generateId("log"), module: "Import/Export", action: `Imported ${moduleName}`, detail: `Imported ${cleanRows.length} rows into '${table.name}'`, createdAt: now });
    saveWorkspace(workspace);
    renderTableSelects();
    showStatus(`Imported ${cleanRows.length} rows into ${table.name}`);
    return table;
  }

  function importJson(jsonText, targetTableId) {
    return commitRows(parseJsonRows(jsonText), targetTableId, document.getElementById("newTableName").value, "JSON");
  }

  function importCsv(csvText, targetTableId) {
    return commitRows(parseCsv(csvText), targetTableId, document.getElementById("newTableName").value, "CSV");
  }

  function renderImportPreview(rows) {
    const target = document.getElementById("importPreview");
    previewRows = normalizeRows(rows || []);
    if (!previewRows.length) {
      target.innerHTML = renderEmptyState("No preview rows yet.");
      return;
    }
    const columns = Object.keys(previewRows[0]);
    target.innerHTML = `
      <div class="file-meta">
        <span class="chip chip-primary">${previewRows.length} parsed rows</span>
        <span class="chip">${columns.length} inferred columns</span>
      </div>
      <div class="table-wrap preview-table-wrap mt-3">
        <table class="data-table">
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
          <tbody>
            ${previewRows.slice(0, loadWorkspace().settings.defaultQueryPageSize).map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function previewImport() {
    const text = document.getElementById("importText").value;
    try {
      if (importMode === "workspace") {
        const workspace = JSON.parse(text);
        const tableCount = workspace.database?.tables?.length || 0;
        document.getElementById("importPreview").innerHTML = `<div class="chip chip-primary">${tableCount} tables in workspace file</div>`;
        return;
      }
      const rows = importMode === "json" ? parseJsonRows(text) : parseCsv(text);
      renderImportPreview(rows);
    } catch (error) {
      document.getElementById("importPreview").innerHTML = `<div class="parse-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function commitImport() {
    const text = document.getElementById("importText").value;
    const targetTableId = document.getElementById("targetTableSelect").value;
    try {
      if (importMode === "workspace") importFullDatabase(text);
      else if (importMode === "json") importJson(text, targetTableId);
      else importCsv(text, targetTableId);
      previewImport();
    } catch (error) {
      showStatus(error.message, "danger");
    }
  }

  function exportTableAsJson(tableId) {
    const table = getTableById(loadWorkspace().database, tableId);
    if (!table) return;
    downloadJson(`${table.name}.json`, table.rows);
  }

  function exportTableAsCsv(tableId) {
    const table = getTableById(loadWorkspace().database, tableId);
    if (!table) return;
    downloadTextFile(`${table.name}.csv`, rowsToCsv(table), "text/csv");
  }

  function exportFullDatabase() {
    downloadJson("json-database-studio-workspace.json", loadWorkspace());
  }

  function importFullDatabase(jsonText) {
    const workspace = JSON.parse(jsonText);
    if (!workspace.database || !Array.isArray(workspace.database.tables)) throw new Error("Workspace JSON is missing database.tables.");
    saveWorkspace(workspace);
    applyThemeSettings();
    renderTableSelects();
    showStatus("Workspace imported");
  }

  function setImportMode(mode) {
    importMode = mode;
    document.querySelectorAll("[data-import-mode]").forEach((button) => button.classList.toggle("active", button.dataset.importMode === mode));
    document.getElementById("targetTableSelect").disabled = mode === "workspace";
    document.getElementById("newTableName").disabled = mode === "workspace";
    document.getElementById("importPreview").innerHTML = "";
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById("importText").value = reader.result;
      previewImport();
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-sidebar-toggle]")) document.body.classList.toggle("sidebar-open");
      const modeButton = event.target.closest("[data-import-mode]");
      if (modeButton) setImportMode(modeButton.dataset.importMode);
      if (event.target.id === "previewImportBtn") previewImport();
      if (event.target.id === "commitImportBtn") commitImport();
      if (event.target.id === "exportJsonBtn") exportTableAsJson(document.getElementById("exportTableSelect").value);
      if (event.target.id === "exportCsvBtn") exportTableAsCsv(document.getElementById("exportTableSelect").value);
      if (event.target.id === "exportWorkspaceBtn") exportFullDatabase();
    });
    document.getElementById("importFileInput").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) readFile(file);
    });
  }

  function initImportExport() {
    initPageTransitions();
    document.getElementById("appSidebar").outerHTML = renderSidebar("import-export");
    setActiveNav();
    renderTableSelects();
    renderImportPreview([]);
    bindEvents();
  }

  window.importJson = importJson;
  window.importCsv = importCsv;
  window.renderImportPreview = renderImportPreview;
  window.exportTableAsJson = exportTableAsJson;
  window.exportTableAsCsv = exportTableAsCsv;
  window.exportFullDatabase = exportFullDatabase;
  window.importFullDatabase = importFullDatabase;

  document.addEventListener("DOMContentLoaded", initImportExport);
})();
