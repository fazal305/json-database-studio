# JSON Database Studio

A browser-based database studio for defining tables, indexes, and
relationships, running real queries in a small SQL-like language, and
importing/exporting real data — all backed by JSON in localStorage.

## Live Links

- GitHub Repository: [fazal305/json-database-studio](https://github.com/fazal305/json-database-studio)
- Live Demo: [https://fazal305.github.io/json-database-studio/](https://fazal305.github.io/json-database-studio/)

## Overview

JSON Database Studio is a professional multi-page frontend application that simulates a lightweight database engine in the browser. It lets users create schemas, manage rows, define indexes and relationships, run SQL-like queries, and import or export real JSON/CSV data using localStorage as the database layer.

## Pages

- Dashboard
- Tables
- Indexes
- Relationships
- Query Console
- Import/Export
- Settings

## Features

- Dynamic table schema builder
- Real row validation by column type
- Inline data grid editing
- Real index creation and lookup comparison
- Relationship builder with ER diagram
- Referential integrity checker
- SQL-like query tokenizer, parser, and executor
- Query history and favorites
- JSON and CSV import/export
- Full workspace import/export
- Live dynamic theme customizer
- Smooth multi-page transitions
- localStorage persistence

## Technologies Used

- HTML5
- CSS3
- Bootstrap 5
- jQuery
- Vanilla JavaScript
- LocalStorage
- Blob API
- Clipboard API

## Learning Outcomes

- Multi-page frontend architecture
- State sharing through localStorage
- Dynamic UI rendering
- Schema-driven forms
- Data validation
- Query parsing and execution
- Index performance comparison
- CSV/JSON parsing
- ER diagram rendering
- Dynamic theming with CSS custom properties

## Architecture Notes

The app uses a multi-page browser architecture with separate HTML, CSS, and JavaScript files for every major module.

All pages share one workspace model stored in localStorage. Tables, rows, indexes, relationships, query history, settings, theme tokens, and activity logs are loaded from and saved back to the same workspace object.

Shared helpers live in `js/shared.js`, while page-specific behavior lives in its own module file. Global styles are stored in `styles.css`, and each page has its own CSS file inside the `css` folder.

The theme system is dynamic. CSS files use custom properties such as `var(--bg)`, `var(--primary)`, and `var(--card)`, while JavaScript applies the real values from the workspace theme at runtime.

The app also includes real index maps, measured lookup comparisons, referential integrity checks, CSV parsing, JSON import/export, and a SQL-like query tokenizer/parser/executor.

## Folder Structure

```text
json-database-studio/
  index.html
  tables.html
  indexes.html
  relationships.html
  query.html
  import-export.html
  settings.html

  styles.css

  css/
    dashboard.css
    tables.css
    indexes.css
    relationships.css
    query.css
    import-export.css
    settings.css

  js/
    shared.js
    dashboard.js
    tables.js
    indexes.js
    relationships.js
    query.js
    import-export.js
    settings.js

  README.md
  LICENSE
  .gitignore
```

How To Run Locally
git clone https://github.com/fazal305/json-database-studio.git
cd json-database-studio

Then open:

index.html

You can also use VS Code Live Server.

How To Use
Open the Dashboard to view workspace stats.
Go to Tables and create or edit schemas.
Add rows and validate data.
Go to Indexes and create lookup indexes.
Compare indexed lookup speed against linear scan.
Go to Relationships and define foreign-key style links.
Run referential integrity checks.
Use Query Console to run SQL-like queries.
Import or export JSON/CSV data.
Customize the app from Settings.
Sample Workflow
Create a customers table with typed columns.
Add rows and confirm required fields are validated.
Create an index on an email or ID column.
Compare real lookup speed using the Indexes page.
Define a relationship between two tables.
Run the integrity checker to find orphaned references.
Run a query such as:
SELECT \* FROM users WHERE age > 18 ORDER BY name ASC LIMIT 10
Export the full workspace as JSON.
Re-import the workspace later.
Customize the theme in Settings and see it apply instantly.
