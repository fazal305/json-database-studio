(function () {
  "use strict";

  const sampleQueries = [
    "SELECT * FROM users WHERE age > 18 ORDER BY name ASC LIMIT 10",
    "SELECT users.name, orders.quantity FROM users JOIN orders ON users.id = orders.userId WHERE orders.quantity >= 2",
    "SELECT * FROM products WHERE category LIKE 'soft%' ORDER BY price DESC",
    "SELECT * FROM orders WHERE userId = 1 LIMIT 25"
  ];

  function updateLineGutter() {
    const input = document.getElementById("queryInput");
    const gutter = document.getElementById("lineGutter");
    const count = Math.max(1, input.value.split("\n").length);
    gutter.innerHTML = Array.from({ length: count }, (_, index) => index + 1).join("<br>");
  }

  function runQuery(queryText) {
    const text = String(queryText || document.getElementById("queryInput").value || "").trim();
    if (!text) {
      renderParseError(new Error("Enter a query before running."));
      return null;
    }
    try {
      const tokens = tokenizeQuery(text);
      const parsed = parseQuery(tokens);
      const result = executeQuery(loadWorkspace().database, parsed);
      persistHistory(text, result);
      renderQueryResults(result);
      renderQueryHistory();
      document.getElementById("parseErrorRegion").innerHTML = "";
      showStatus(`Returned ${result.rows.length} rows`);
      return result;
    } catch (error) {
      renderParseError(error);
      return null;
    }
  }

  function persistHistory(queryText, result, favorite) {
    const workspace = loadWorkspace();
    const existing = workspace.queryHistory.find((entry) => entry.queryText === queryText);
    const entry = {
      id: existing?.id || generateId("query"),
      queryText,
      favorite: Boolean(favorite ?? existing?.favorite),
      rowsReturned: result.rows.length,
      executionMs: result.stats.executionMs,
      usedIndex: result.stats.usedIndex,
      createdAt: new Date().toISOString()
    };
    workspace.queryHistory = [entry, ...workspace.queryHistory.filter((item) => item.id !== entry.id)].slice(0, 60);
    saveWorkspace(workspace);
  }

  function renderQueryResults(result) {
    const statsTarget = document.getElementById("queryStats");
    const resultsTarget = document.getElementById("queryResults");
    statsTarget.innerHTML = [
      { label: "Rows returned", value: result.rows.length, meta: "After filters and limit" },
      { label: "Rows scanned", value: result.stats.rowsScanned, meta: "Executor work count" },
      { label: "Index used", value: result.stats.usedIndex ? "Yes" : "No", meta: "Equality filter acceleration" },
      { label: "Execution", value: `${result.stats.executionMs} ms`, meta: "Measured in browser" }
    ].map((stat) => `
      <article class="stat-card">
        <p class="stat-label">${escapeHtml(stat.label)}</p>
        <p class="stat-value">${escapeHtml(stat.value)}</p>
        <p class="stat-meta">${escapeHtml(stat.meta)}</p>
      </article>
    `).join("");

    if (!result.rows.length) {
      resultsTarget.innerHTML = renderEmptyState("Query returned no rows.");
      return;
    }
    const columns = Array.from(result.rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()));
    resultsTarget.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
          <tbody>
            ${result.rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderQueryHistory() {
    const workspace = loadWorkspace();
    const target = document.getElementById("queryHistory");
    const history = workspace.queryHistory;
    if (!history.length) {
      target.innerHTML = renderEmptyState("Run a query to start history.");
      return;
    }
    target.innerHTML = history.map((entry) => `
      <article class="query-history-item">
        <div class="d-flex justify-content-between gap-2">
          <span class="chip ${entry.favorite ? "chip-warning" : ""}">${entry.favorite ? "favorite" : "history"}</span>
          <span class="muted small">${escapeHtml(formatTimestamp(entry.createdAt))}</span>
        </div>
        <div class="query-history-text" title="${escapeHtml(entry.queryText)}">${escapeHtml(entry.queryText)}</div>
        <div class="table-list-meta">
          <span class="chip">${entry.rowsReturned} rows</span>
          <span class="chip">${entry.executionMs} ms</span>
          <span class="chip">${entry.usedIndex ? "index" : "scan"}</span>
        </div>
        <div class="cell-actions">
          <button class="btn btn-sm btn-outline-primary" type="button" data-rerun-query="${entry.id}">Run</button>
          <button class="btn btn-sm btn-ghost" type="button" data-favorite-query="${entry.id}">${entry.favorite ? "Unfavorite" : "Favorite"}</button>
        </div>
      </article>
    `).join("");
  }

  function rerunHistoryQuery(id) {
    const entry = loadWorkspace().queryHistory.find((item) => item.id === id);
    if (!entry) return;
    document.getElementById("queryInput").value = entry.queryText;
    updateLineGutter();
    runQuery(entry.queryText);
  }

  function toggleFavoriteQuery(id) {
    const workspace = loadWorkspace();
    const entry = workspace.queryHistory.find((item) => item.id === id);
    if (!entry) return;
    entry.favorite = !entry.favorite;
    saveWorkspace(workspace);
    renderQueryHistory();
  }

  function renderParseError(error) {
    document.getElementById("parseErrorRegion").innerHTML = `
      <div class="parse-error">
        <strong>Parse error</strong>
        <div>${escapeHtml(error.message || error)}</div>
      </div>
    `;
    document.getElementById("queryStats").innerHTML = "";
  }

  function renderSampleQueries() {
    const target = document.getElementById("sampleQueries");
    target.innerHTML = sampleQueries.map((query) => `
      <article class="query-history-item">
        <div class="query-history-text" title="${escapeHtml(query)}">${escapeHtml(query)}</div>
        <button class="btn btn-sm btn-outline-primary" type="button" data-sample-query="${escapeHtml(query)}">Use Query</button>
      </article>
    `).join("");
  }

  function saveCurrentAsFavorite() {
    const text = document.getElementById("queryInput").value.trim();
    if (!text) {
      showStatus("Enter a query before saving.", "warning");
      return;
    }
    const workspace = loadWorkspace();
    const existing = workspace.queryHistory.find((entry) => entry.queryText === text);
    if (existing) {
      existing.favorite = true;
      existing.createdAt = new Date().toISOString();
    } else {
      workspace.queryHistory.unshift({
        id: generateId("query"),
        queryText: text,
        favorite: true,
        rowsReturned: 0,
        executionMs: 0,
        usedIndex: false,
        createdAt: new Date().toISOString()
      });
    }
    saveWorkspace(workspace);
    renderQueryHistory();
    showStatus("Query saved as favorite");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-sidebar-toggle]")) document.body.classList.toggle("sidebar-open");
      if (event.target.id === "runQueryBtn") runQuery();
      if (event.target.id === "favoriteQueryBtn") saveCurrentAsFavorite();
      const rerun = event.target.closest("[data-rerun-query]");
      if (rerun) rerunHistoryQuery(rerun.dataset.rerunQuery);
      const favorite = event.target.closest("[data-favorite-query]");
      if (favorite) toggleFavoriteQuery(favorite.dataset.favoriteQuery);
      const sample = event.target.closest("[data-sample-query]");
      if (sample) {
        document.getElementById("queryInput").value = sample.dataset.sampleQuery;
        updateLineGutter();
      }
    });
    document.getElementById("queryInput").addEventListener("input", updateLineGutter);
    document.getElementById("queryInput").addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runQuery();
    });
  }

  function initQuery() {
    initPageTransitions();
    document.getElementById("appSidebar").outerHTML = renderSidebar("query");
    setActiveNav();
    const params = new URLSearchParams(window.location.search);
    const table = params.get("table") || loadWorkspace().database.tables[0]?.name || "users";
    document.getElementById("queryInput").value = `SELECT * FROM ${table} LIMIT ${loadWorkspace().settings.defaultQueryPageSize}`;
    updateLineGutter();
    renderQueryHistory();
    renderSampleQueries();
    bindEvents();
  }

  window.runQuery = runQuery;
  window.renderQueryResults = renderQueryResults;
  window.renderQueryHistory = renderQueryHistory;
  window.rerunHistoryQuery = rerunHistoryQuery;
  window.toggleFavoriteQuery = toggleFavoriteQuery;
  window.renderParseError = renderParseError;

  document.addEventListener("DOMContentLoaded", initQuery);
})();
