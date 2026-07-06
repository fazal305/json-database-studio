(function () {
  "use strict";

  let selectedTableId = null;

  function tableOptions(selectedId) {
    return loadWorkspace().database.tables.map((table) => `<option value="${table.id}" ${table.id === selectedId ? "selected" : ""}>${escapeHtml(table.name)}</option>`).join("");
  }

  function columnOptions(tableId, selectedColumn) {
    const table = getTableById(loadWorkspace().database, tableId);
    return table ? table.columns.map((column) => `<option value="${escapeHtml(column.name)}" ${column.name === selectedColumn ? "selected" : ""}>${escapeHtml(column.name)} (${escapeHtml(column.type)})</option>`).join("") : "";
  }

  function renderRelationshipFormOptions(relationship) {
    const workspace = loadWorkspace();
    const first = workspace.database.tables[0];
    const second = workspace.database.tables[1] || first;
    const fromTableId = relationship?.fromTableId || first?.id || "";
    const toTableId = relationship?.toTableId || second?.id || "";
    document.getElementById("relationshipId").value = relationship?.id || "";
    document.getElementById("relationshipName").value = relationship?.name || "";
    document.getElementById("fromTableSelect").innerHTML = tableOptions(fromTableId);
    document.getElementById("toTableSelect").innerHTML = tableOptions(toTableId);
    document.getElementById("fromColumnSelect").innerHTML = columnOptions(fromTableId, relationship?.fromColumn);
    document.getElementById("toColumnSelect").innerHTML = columnOptions(toTableId, relationship?.toColumn);
    document.getElementById("relationshipType").value = relationship?.type || "many-to-one";
  }

  function renderErDiagramView() {
    const workspace = loadWorkspace();
    const stage = document.getElementById("diagramStage");
    renderErDiagram(workspace.database, stage);
    if (selectedTableId) {
      const tableBox = stage.querySelector(`[data-table-id="${CSS.escape(selectedTableId)}"]`);
      if (tableBox) tableBox.classList.add("active");
    }
  }

  function renderRelationshipList() {
    const workspace = loadWorkspace();
    const target = document.getElementById("relationshipList");
    if (!workspace.database.relationships.length) {
      target.innerHTML = renderEmptyState("No relationships defined yet.");
      return;
    }
    target.innerHTML = workspace.database.relationships.map((relationship) => {
      const from = getTableById(workspace.database, relationship.fromTableId);
      const to = getTableById(workspace.database, relationship.toTableId);
      return `
        <article class="relationship-card">
          <div class="d-flex justify-content-between gap-2">
            <div>
              <strong>${escapeHtml(relationship.name)}</strong>
              <p class="mb-2 muted small">${escapeHtml(from?.name || "missing")}.${escapeHtml(relationship.fromColumn)} -> ${escapeHtml(to?.name || "missing")}.${escapeHtml(relationship.toColumn)}</p>
              <span class="chip chip-primary">${escapeHtml(relationship.type)}</span>
            </div>
            <div class="cell-actions">
              <button class="btn btn-sm btn-ghost" type="button" data-edit-relationship="${relationship.id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger" type="button" data-delete-relationship="${relationship.id}">Delete</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function readRelationshipForm() {
    const fromTableId = document.getElementById("fromTableSelect").value;
    const toTableId = document.getElementById("toTableSelect").value;
    const fromColumn = document.getElementById("fromColumnSelect").value;
    const toColumn = document.getElementById("toColumnSelect").value;
    return {
      id: document.getElementById("relationshipId").value,
      name: slugify(document.getElementById("relationshipName").value) || `${fromColumn}_${toColumn}`,
      fromTableId,
      fromColumn,
      toTableId,
      toColumn,
      type: document.getElementById("relationshipType").value
    };
  }

  function createRelationship(config) {
    const workspace = loadWorkspace();
    if (!getTableById(workspace.database, config.fromTableId) || !getTableById(workspace.database, config.toTableId)) {
      showStatus("Choose valid source and target tables.", "danger");
      return;
    }
    workspace.database.relationships.push({ ...config, id: generateId("rel"), createdAt: new Date().toISOString() });
    workspace.activityLog.unshift({ id: generateId("log"), module: "Relationships", action: "Created relationship", detail: `Created relationship '${config.name}'`, createdAt: new Date().toISOString() });
    saveWorkspace(workspace);
    showStatus("Relationship created");
    renderAll();
  }

  function editRelationship(id, config) {
    const workspace = loadWorkspace();
    const relationship = workspace.database.relationships.find((item) => item.id === id);
    if (!relationship) return;
    Object.assign(relationship, config);
    workspace.activityLog.unshift({ id: generateId("log"), module: "Relationships", action: "Edited relationship", detail: `Updated relationship '${config.name}'`, createdAt: new Date().toISOString() });
    saveWorkspace(workspace);
    showStatus("Relationship updated");
    renderAll();
  }

  function deleteRelationship(id) {
    const workspace = loadWorkspace();
    const relationship = workspace.database.relationships.find((item) => item.id === id);
    if (!relationship) return;
    workspace.database.relationships = workspace.database.relationships.filter((item) => item.id !== id);
    workspace.activityLog.unshift({ id: generateId("log"), module: "Relationships", action: "Deleted relationship", detail: `Deleted relationship '${relationship.name}'`, createdAt: new Date().toISOString() });
    saveWorkspace(workspace);
    showStatus("Relationship deleted", "warning");
    renderAll();
  }

  function runIntegrityCheck() {
    const workspace = loadWorkspace();
    const issues = checkReferentialIntegrity(workspace.database);
    const target = document.getElementById("integrityResults");
    if (!issues.length) {
      target.innerHTML = `<div class="chip chip-success">All relationships are valid</div>`;
      return issues;
    }
    target.innerHTML = issues.map((issue) => `
      <article class="orphan-card">
        <strong>${escapeHtml(issue.relationship.name)}</strong>
        <p class="mb-1 muted small">${escapeHtml(issue.fromTable.name)} row ${escapeHtml(issue.row._id)} references missing ${escapeHtml(issue.toTable.name)}.${escapeHtml(issue.relationship.toColumn)} value ${escapeHtml(issue.value)}</p>
        <code class="code-surface d-block p-2">${escapeHtml(JSON.stringify(issue.row))}</code>
      </article>
    `).join("");
    return issues;
  }

  function renderTableDetailPanel(tableId) {
    selectedTableId = tableId || selectedTableId;
    const workspace = loadWorkspace();
    const table = getTableById(workspace.database, selectedTableId);
    const target = document.getElementById("tableDetailPanel");
    if (!table) {
      target.innerHTML = renderEmptyState("Click a table in the diagram.");
      return;
    }
    target.innerHTML = `
      <h3 class="panel-title">${escapeHtml(table.name)}</h3>
      <p class="muted small">${table.rows.length} rows, ${table.columns.length} columns</p>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Column</th><th>Type</th><th>Rules</th></tr></thead>
          <tbody>
            ${table.columns.map((column) => `<tr>
              <td>${escapeHtml(column.name)}</td>
              <td><span class="type-pill">${escapeHtml(column.type)}</span></td>
              <td>${column.primaryKey ? `<span class="chip chip-primary">PK</span>` : ""} ${column.required ? `<span class="chip">required</span>` : ""}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
    renderErDiagramView();
  }

  function resetForm() {
    renderRelationshipFormOptions(null);
  }

  function renderAll() {
    renderErDiagramView();
    renderRelationshipList();
    renderRelationshipFormOptions(null);
    renderTableDetailPanel(selectedTableId);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-sidebar-toggle]")) document.body.classList.toggle("sidebar-open");
      const tableBox = event.target.closest("[data-table-id]");
      if (tableBox) renderTableDetailPanel(tableBox.dataset.tableId);
      const editButton = event.target.closest("[data-edit-relationship]");
      if (editButton) {
        const relationship = loadWorkspace().database.relationships.find((item) => item.id === editButton.dataset.editRelationship);
        renderRelationshipFormOptions(relationship);
      }
      const deleteButton = event.target.closest("[data-delete-relationship]");
      if (deleteButton) deleteRelationship(deleteButton.dataset.deleteRelationship);
      if (event.target.id === "integrityBtn") runIntegrityCheck();
      if (event.target.id === "resetRelationshipForm") resetForm();
    });

    document.getElementById("fromTableSelect").addEventListener("change", (event) => {
      document.getElementById("fromColumnSelect").innerHTML = columnOptions(event.target.value);
    });
    document.getElementById("toTableSelect").addEventListener("change", (event) => {
      document.getElementById("toColumnSelect").innerHTML = columnOptions(event.target.value);
    });
    document.getElementById("relationshipForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const config = readRelationshipForm();
      if (config.id) editRelationship(config.id, config);
      else createRelationship(config);
      event.target.reset();
    });
  }

  function initRelationships() {
    initPageTransitions();
    document.getElementById("appSidebar").outerHTML = renderSidebar("relationships");
    setActiveNav();
    selectedTableId = loadWorkspace().database.tables[0]?.id || null;
    renderAll();
    bindEvents();
  }

  window.renderErDiagramView = renderErDiagramView;
  window.createRelationship = createRelationship;
  window.editRelationship = editRelationship;
  window.deleteRelationship = deleteRelationship;
  window.runIntegrityCheck = runIntegrityCheck;
  window.renderTableDetailPanel = renderTableDetailPanel;

  document.addEventListener("DOMContentLoaded", initRelationships);
})();
