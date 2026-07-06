(function () {
    "use strict";

    const themeTokens = [
        { key: "bg", label: "Background", type: "color" },
        { key: "bgSoft", label: "Soft Background", type: "color" },
        { key: "card", label: "Card Surface", type: "text" },
        { key: "text", label: "Text", type: "color" },
        { key: "muted", label: "Muted Text", type: "color" },
        { key: "primary", label: "Primary Accent", type: "color" },
        { key: "secondary", label: "Secondary Accent", type: "color" },
        { key: "success", label: "Success", type: "color" },
        { key: "warning", label: "Warning", type: "color" },
        { key: "danger", label: "Danger", type: "color" },
        { key: "radius", label: "Radius", type: "range" },
        { key: "fontFamily", label: "Font Family", type: "font" }
    ];

    const themePresets = [
        {
            id: "night-cyan",
            name: "Night Cyan",
            values: JsonDbStudio.defaultWorkspace.theme
        },
        {
            id: "emerald-terminal",
            name: "Emerald Terminal",
            values: {
                bg: "#03120b",
                bgSoft: "#071c12",
                card: "rgba(8, 28, 18, 0.92)",
                text: "#edfff5",
                muted: "#9fd0b7",
                primary: "#34d399",
                secondary: "#22c55e",
                success: "#86efac",
                warning: "#fde047",
                danger: "#fb7185",
                radius: 14,
                fontFamily: "Inter, sans-serif"
            }
        },
        {
            id: "violet-lab",
            name: "Violet Lab",
            values: {
                bg: "#0b0618",
                bgSoft: "#130b2c",
                card: "rgba(22, 13, 48, 0.92)",
                text: "#fbf7ff",
                muted: "#b9a8d8",
                primary: "#a855f7",
                secondary: "#22d3ee",
                success: "#4ade80",
                warning: "#facc15",
                danger: "#fb7185",
                radius: 22,
                fontFamily: "Inter, sans-serif"
            }
        }
    ];

    function getWorkspace() {
        return JsonDbStudio.loadWorkspace();
    }

    function persist(workspace) {
        JsonDbStudio.saveWorkspace(workspace);
        JsonDbStudio.applyThemeSettings();
        renderThemeCustomizer();
        renderThemePreview();
        renderWorkspaceSummary();
    }

    function renderThemeCustomizer() {
        const workspace = getWorkspace();
        const container = document.getElementById("themeCustomizer");

        container.innerHTML = themeTokens.map((token) => {
            const value = workspace.theme[token.key];

            if (token.type === "range") {
                return `
          <label class="theme-token">
            <span class="form-label mb-0">${JsonDbStudio.escapeHtml(token.label)}</span>
            <input class="form-range" type="range" min="6" max="34" step="1" value="${Number(value)}" data-theme-token="${token.key}">
            <span class="form-text">${Number(value)}px</span>
          </label>
        `;
            }

            if (token.type === "font") {
                return `
          <label class="theme-token">
            <span class="form-label mb-0">${JsonDbStudio.escapeHtml(token.label)}</span>
            <select class="form-select" data-theme-token="${token.key}">
              ${[
                        "Inter, sans-serif",
                        "Arial, sans-serif",
                        "Segoe UI, sans-serif",
                        "Georgia, serif",
                        "Courier New, monospace"
                    ].map((font) => `<option value="${JsonDbStudio.escapeHtml(font)}" ${font === value ? "selected" : ""}>${JsonDbStudio.escapeHtml(font)}</option>`).join("")}
            </select>
          </label>
        `;
            }

            if (token.type === "color") {
                return `
          <label class="theme-token">
            <span class="form-label mb-0">${JsonDbStudio.escapeHtml(token.label)}</span>
            <div class="color-input-row">
              <input class="form-control form-control-color" type="color" value="${JsonDbStudio.escapeHtml(value)}" data-theme-token="${token.key}">
              <input class="form-control" type="text" value="${JsonDbStudio.escapeHtml(value)}" data-theme-token="${token.key}">
            </div>
          </label>
        `;
            }

            return `
        <label class="theme-token">
          <span class="form-label mb-0">${JsonDbStudio.escapeHtml(token.label)}</span>
          <input class="form-control" type="text" value="${JsonDbStudio.escapeHtml(value)}" data-theme-token="${token.key}">
        </label>
      `;
        }).join("");
    }

    function updateThemeToken(name, value) {
        const workspace = getWorkspace();
        workspace.theme[name] = name === "radius" ? Number(value) : value;
        JsonDbStudio.saveWorkspace(workspace);
        JsonDbStudio.applyThemeSettings();

        if (name === "radius") {
            document.querySelectorAll(`[data-theme-token="${name}"]`).forEach((input) => {
                input.closest(".theme-token")?.querySelector(".form-text") && (input.closest(".theme-token").querySelector(".form-text").textContent = `${Number(value)}px`);
            });
        }

        renderThemePreview();
        renderWorkspaceSummary();
    }

    function renderThemePresets() {
        const workspace = getWorkspace();
        const container = document.getElementById("themePresets");

        container.innerHTML = themePresets.map((preset) => {
            const active = preset.values.primary === workspace.theme.primary && preset.values.bg === workspace.theme.bg;
            const swatches = ["bg", "card", "primary", "secondary", "success"].map((key) => {
                return `<span class="preset-swatch" style="--swatch:${JsonDbStudio.escapeHtml(preset.values[key])}"></span>`;
            }).join("");

            return `
        <button class="theme-preset ${active ? "active" : ""}" type="button" data-preset-id="${preset.id}">
          <strong>${JsonDbStudio.escapeHtml(preset.name)}</strong>
          <span class="preset-swatches">${swatches}</span>
          <span class="form-text">Load and edit this preset.</span>
        </button>
      `;
        }).join("");
    }

    function applyThemePreset(presetId) {
        const preset = themePresets.find((item) => item.id === presetId);
        if (!preset) return;

        const workspace = getWorkspace();
        workspace.theme = { ...workspace.theme, ...preset.values };
        JsonDbStudio.saveWorkspace(workspace);
        JsonDbStudio.applyThemeSettings();
        renderAll();
        JsonDbStudio.addActivityLog("Settings", "Applied theme preset", `Applied ${preset.name}`);
        JsonDbStudio.showStatus(`${preset.name} theme applied`);
    }

    function resetThemeToDefault() {
        const workspace = getWorkspace();
        workspace.theme = { ...JsonDbStudio.defaultWorkspace.theme };
        persist(workspace);
        renderThemePresets();
        JsonDbStudio.addActivityLog("Settings", "Reset theme", "Restored default theme tokens");
        JsonDbStudio.showStatus("Default theme restored");
    }

    function setTransitionSpeed(ms) {
        const workspace = getWorkspace();
        workspace.settings.transitionSpeedMs = Number(ms);
        JsonDbStudio.saveWorkspace(workspace);
        JsonDbStudio.applyThemeSettings();
        document.getElementById("transitionSpeedValue").textContent = String(ms);
    }

    function setDefaultQueryPageSize(size) {
        const workspace = getWorkspace();
        workspace.settings.defaultQueryPageSize = Math.max(1, Number(size) || 25);
        JsonDbStudio.saveWorkspace(workspace);
        renderWorkspaceSummary();
    }

    function toggleCompactSidebar() {
        const workspace = getWorkspace();
        workspace.settings.compactSidebar = !workspace.settings.compactSidebar;
        JsonDbStudio.saveWorkspace(workspace);
        JsonDbStudio.applyThemeSettings();
    }

    function renderThemePreview() {
        const workspace = getWorkspace();
        const container = document.getElementById("themePreview");

        container.innerHTML = `
      <div>
        <span class="chip chip-primary">Primary</span>
        <span class="chip chip-success">Valid</span>
        <span class="chip chip-warning">Warning</span>
        <span class="chip chip-danger">Danger</span>
      </div>

      <div>
        <h3 class="panel-title">Database table preview</h3>
        <p class="panel-subtitle">Font, radius, surface, and text colors are coming from workspace.theme.</p>
      </div>

      <div class="preview-strip">
        <button class="btn btn-primary" type="button">Primary Button</button>
        <button class="btn btn-outline-primary" type="button">Outline Button</button>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Current Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Primary</td>
              <td>${JsonDbStudio.escapeHtml(workspace.theme.primary)}</td>
            </tr>
            <tr>
              <td>Radius</td>
              <td>${JsonDbStudio.escapeHtml(workspace.theme.radius)}px</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    }

    function renderWorkspaceSummary() {
        const workspace = getWorkspace();
        const tables = workspace.database.tables;
        const rowCount = tables.reduce((total, table) => total + table.rows.length, 0);

        document.getElementById("workspaceSummary").innerHTML = `
      <div class="stat-card">
        <p class="stat-label">Tables</p>
        <p class="stat-value">${tables.length}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Rows</p>
        <p class="stat-value">${rowCount}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Indexes</p>
        <p class="stat-value">${workspace.database.indexes.length}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">Relationships</p>
        <p class="stat-value">${workspace.database.relationships.length}</p>
      </div>
    `;

        document.getElementById("transitionSpeedInput").value = workspace.settings.transitionSpeedMs;
        document.getElementById("transitionSpeedValue").textContent = workspace.settings.transitionSpeedMs;
        document.getElementById("queryPageSizeInput").value = workspace.settings.defaultQueryPageSize;
        document.getElementById("compactSidebarInput").checked = Boolean(workspace.settings.compactSidebar);
    }

    function exportWorkspace() {
        JsonDbStudio.downloadJson("json-database-studio-workspace.json", getWorkspace());
        JsonDbStudio.addActivityLog("Settings", "Exported workspace", "Downloaded full workspace JSON");
        JsonDbStudio.showStatus("Workspace exported");
    }

    function importWorkspace(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const imported = JSON.parse(String(reader.result));
                JsonDbStudio.saveWorkspace(imported);
                JsonDbStudio.applyThemeSettings();
                renderAll();
                JsonDbStudio.addActivityLog("Settings", "Imported workspace", "Imported full workspace JSON");
                JsonDbStudio.showStatus("Workspace imported");
            } catch (error) {
                JsonDbStudio.showStatus("Invalid workspace JSON file", "danger");
            } finally {
                event.target.value = "";
            }
        };

        reader.readAsText(file);
    }

    function resetDemoWorkspace() {
        if (!confirm("Reset the full workspace to demo data? Current saved data will be replaced.")) return;

        JsonDbStudio.resetWorkspace();
        JsonDbStudio.applyThemeSettings();
        renderAll();
        JsonDbStudio.showStatus("Demo workspace restored");
    }

    function clearWorkspace() {
        if (!confirm("Clear all JSON Database Studio localStorage data?")) return;

        localStorage.removeItem(JsonDbStudio.STORAGE_KEY);
        JsonDbStudio.seedDemoData();
        JsonDbStudio.applyThemeSettings();
        renderAll();
        JsonDbStudio.showStatus("Workspace cleared and demo data reseeded");
    }

    function bindEvents() {
        document.addEventListener("input", (event) => {
            const token = event.target.dataset.themeToken;
            if (token) {
                updateThemeToken(token, event.target.value);

                if (event.target.type === "color") {
                    const textInput = event.target.parentElement.querySelector('input[type="text"]');
                    if (textInput) textInput.value = event.target.value;
                }

                if (event.target.type === "text") {
                    const colorInput = event.target.parentElement.querySelector('input[type="color"]');
                    if (colorInput && /^#[0-9a-f]{6}$/i.test(event.target.value)) {
                        colorInput.value = event.target.value;
                    }
                }
            }

            if (event.target.id === "transitionSpeedInput") {
                setTransitionSpeed(event.target.value);
            }

            if (event.target.id === "queryPageSizeInput") {
                setDefaultQueryPageSize(event.target.value);
            }
        });

        document.addEventListener("change", (event) => {
            if (event.target.id === "compactSidebarInput") {
                toggleCompactSidebar();
            }

            if (event.target.id === "workspaceImportInput") {
                importWorkspace(event);
            }
        });

        document.addEventListener("click", (event) => {
            const presetButton = event.target.closest("[data-preset-id]");
            if (presetButton) {
                applyThemePreset(presetButton.dataset.presetId);
            }

            if (event.target.id === "resetThemeBtn") {
                resetThemeToDefault();
            }

            if (event.target.id === "exportWorkspaceBtn") {
                exportWorkspace();
            }

            if (event.target.id === "resetDemoBtn") {
                resetDemoWorkspace();
            }

            if (event.target.id === "clearWorkspaceBtn") {
                clearWorkspace();
            }
        });
    }

    function renderAll() {
        renderThemeCustomizer();
        renderThemePresets();
        renderThemePreview();
        renderWorkspaceSummary();
    }

    window.renderThemeCustomizer = renderThemeCustomizer;
    window.updateThemeToken = updateThemeToken;
    window.applyThemePreset = applyThemePreset;
    window.resetThemeToDefault = resetThemeToDefault;
    window.setTransitionSpeed = setTransitionSpeed;
    window.setDefaultQueryPageSize = setDefaultQueryPageSize;
    window.toggleCompactSidebar = toggleCompactSidebar;
    window.exportWorkspace = exportWorkspace;
    window.importWorkspace = importWorkspace;
    window.resetDemoWorkspace = resetDemoWorkspace;
    window.clearWorkspace = clearWorkspace;

    document.addEventListener("DOMContentLoaded", () => {
        JsonDbStudio.initPageTransitions();
        document.getElementById("appSidebar").outerHTML = JsonDbStudio.renderSidebar("settings");
        renderAll();
        bindEvents();
    });
})();