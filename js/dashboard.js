(function () {
  "use strict";

  function getWorkspaceStats(workspace) {
    const tables = workspace.database.tables;
    const totalRows = tables.reduce((sum, table) => sum + table.rows.length, 0);
    const recentTable = tables
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0];

    return [
      { label: "Tables", value: tables.length, meta: "Schemas in workspace" },
      { label: "Rows", value: totalRows, meta: "Across every table" },
      { label: "Indexes", value: workspace.database.indexes.length, meta: "Lookup maps available" },
      { label: "Relationships", value: workspace.database.relationships.length, meta: "Foreign-key links" },
      { label: "Recently Modified", value: recentTable ? recentTable.name : "None", meta: recentTable ? formatTimestamp(recentTable.updatedAt) : "No tables yet" }
    ];
  }

  function renderDashboardStats() {
    const workspace = loadWorkspace();
    const target = document.getElementById("dashboardStats");
    if (!target) return;

    target.innerHTML = getWorkspaceStats(workspace).map((stat) => `
      <article class="stat-card">
        <p class="stat-label">${escapeHtml(stat.label)}</p>
        <p class="stat-value">${escapeHtml(stat.value)}</p>
        <p class="stat-meta">${escapeHtml(stat.meta)}</p>
      </article>
    `).join("");
  }

  function renderQuickActions() {
    const target = document.getElementById("quickActions");
    if (!target) return;

    const actions = [
      { href: "tables.html", label: "New Table", detail: "Create a typed schema", icon: "TB" },
      { href: "query.html", label: "Query Console", detail: "Run SQL-like queries", icon: "QL" },
      { href: "relationships.html", label: "Relationships", detail: "Model and inspect links", icon: "ER" },
      { href: "import-export.html", label: "Import/Export", detail: "Move JSON and CSV data", icon: "IO" }
    ];

    target.innerHTML = actions.map((action) => `
      <a class="action-card flex-grow-1" href="${action.href}">
        <span>
          <strong>${escapeHtml(action.label)}</strong>
          <span class="d-block muted small">${escapeHtml(action.detail)}</span>
        </span>
        <span class="quick-action-icon">${escapeHtml(action.icon)}</span>
      </a>
    `).join("");
  }

  function renderRecentTables() {
    const workspace = loadWorkspace();
    const target = document.getElementById("recentTables");
    if (!target) return;

    const tables = workspace.database.tables
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    if (!tables.length) {
      target.innerHTML = renderEmptyState("No tables yet. Create one from the Tables page.");
      return;
    }

    target.innerHTML = tables.map((table) => `
      <article class="recent-table-item">
        <div class="recent-table-top">
          <div>
            <h3 class="recent-table-name">${escapeHtml(table.name)}</h3>
            <p class="mb-0 muted small">Updated ${escapeHtml(formatTimestamp(table.updatedAt || table.createdAt))}</p>
          </div>
          <span class="chip chip-primary">${table.columns.length} columns</span>
        </div>
        <div class="table-list-meta">
          <span class="chip">${table.rows.length} rows</span>
          <span class="chip">${table.columns.filter((column) => column.required).length} required fields</span>
          <span class="chip">${table.columns.filter((column) => column.primaryKey).length} primary keys</span>
        </div>
        <div class="cell-actions">
          <a class="btn btn-sm btn-outline-primary" href="tables.html?table=${encodeURIComponent(table.id)}">Open</a>
          <a class="btn btn-sm btn-ghost" href="query.html?table=${encodeURIComponent(table.name)}">Query</a>
          <button class="btn btn-sm btn-outline-danger" type="button" data-delete-table="${escapeHtml(table.id)}">Delete</button>
        </div>
      </article>
    `).join("");
  }

  function renderRecentActivityLog() {
    const workspace = loadWorkspace();
    const target = document.getElementById("recentActivityLog");
    if (!target) return;

    const entries = workspace.activityLog.slice(0, 10);
    if (!entries.length) {
      target.innerHTML = renderEmptyState("Activity will appear here as you work.");
      return;
    }

    target.innerHTML = entries.map((entry) => `
      <article class="activity-item">
        <div class="activity-top">
          <div>
            <span class="activity-module">${escapeHtml(entry.module)}</span>
            <h3 class="activity-action">${escapeHtml(entry.action)}</h3>
          </div>
          <span class="chip">${escapeHtml(formatTimestamp(entry.createdAt))}</span>
        </div>
        <p class="activity-detail">${escapeHtml(entry.detail)}</p>
      </article>
    `).join("");
  }

  function deleteTableFromDashboard(tableId) {
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, tableId);
    if (!table) return;

    const references = [
      ...workspace.database.indexes.filter((index) => index.tableId === tableId),
      ...workspace.database.relationships.filter((relationship) => relationship.fromTableId === tableId || relationship.toTableId === tableId)
    ];
    const warning = references.length
      ? `Delete '${table.name}' and ${references.length} related index/relationship records?`
      : `Delete '${table.name}'?`;

    if (!window.confirm(warning)) return;

    workspace.database.tables = workspace.database.tables.filter((item) => item.id !== tableId);
    workspace.database.indexes = workspace.database.indexes.filter((index) => index.tableId !== tableId);
    workspace.database.relationships = workspace.database.relationships.filter((relationship) => relationship.fromTableId !== tableId && relationship.toTableId !== tableId);
    workspace.activityLog.unshift({
      id: generateId("log"),
      module: "Dashboard",
      action: "Deleted table",
      detail: `Deleted table '${table.name}' from dashboard quick actions`,
      createdAt: new Date().toISOString()
    });
    saveWorkspace(workspace);
    showStatus(`Deleted ${table.name}`, "warning");
    renderDashboardStats();
    renderRecentTables();
    renderRecentActivityLog();
  }

  function bindDashboardEvents() {
    document.addEventListener("click", (event) => {
      const sidebarToggle = event.target.closest("[data-sidebar-toggle]");
      if (sidebarToggle) {
        document.body.classList.toggle("sidebar-open");
        return;
      }

      const deleteButton = event.target.closest("[data-delete-table]");
      if (deleteButton) {
        deleteTableFromDashboard(deleteButton.dataset.deleteTable);
      }
    });
  }

  function initDashboard() {
    initPageTransitions();
    document.getElementById("appSidebar").outerHTML = renderSidebar("dashboard");
    setActiveNav();
    renderDashboardStats();
    renderQuickActions();
    renderRecentTables();
    renderRecentActivityLog();
    bindDashboardEvents();
  }

  window.renderDashboardStats = renderDashboardStats;
  window.renderRecentTables = renderRecentTables;
  window.renderRecentActivityLog = renderRecentActivityLog;
  window.renderQuickActions = renderQuickActions;

  document.addEventListener("DOMContentLoaded", initDashboard);
})();
