const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") res.sendStatus(200);
  else next();
});

function isPrimitiveArray(arr) {
  return (
    Array.isArray(arr) &&
    arr.every((item) => ["string", "number", "boolean"].includes(typeof item))
  );
}

function extractAllColumns(data) {
  const columns = new Set();

  function recurse(obj, prefix = "") {
    if (Array.isArray(obj)) {
      if (obj.every(isPrimitiveArray)) {
        columns.add(prefix);
      } else {
        obj.forEach((item) => recurse(item, prefix));
      }
    } else if (typeof obj === "object" && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        recurse(value, path);
      }
    } else {
      columns.add(prefix);
    }
  }

  data.forEach((item) => recurse(item));
  return Array.from(columns);
}

function buildHeaderTree(columns) {
  const tree = {};
  for (const col of columns) {
    const parts = col.split(".");
    let node = tree;
    for (const part of parts) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
  }
  return tree;
}

function countLeaves(tree) {
  if (!tree || typeof tree !== "object" || Object.keys(tree).length === 0)
    return 1;
  return Object.values(tree).reduce((sum, node) => sum + countLeaves(node), 0);
}

function getMaxDepth(tree) {
  if (!tree || typeof tree !== "object" || Object.keys(tree).length === 0)
    return 0;
  return 1 + Math.max(...Object.values(tree).map(getMaxDepth));
}

function buildHeaderRows(tree) {
  const maxDepth = getMaxDepth(tree);
  const rows = Array.from({ length: maxDepth }, () => []);

  function traverse(node, level) {
    for (const key in node) {
      const child = node[key];
      const span = countLeaves(child);
      rows[level].push({ label: key, span });
      if (Object.keys(child).length > 0) {
        traverse(child, level + 1);
      } else {
        for (let l = level + 1; l < maxDepth; l++) {
          rows[l].push({ label: "", span: 1 });
        }
      }
    }
  }

  traverse(tree, 0);
  return rows;
}

function generateMarkdownDocument(data, options = {}) {
  const title = options.title || "Dynamic Data Table";
  let markdown = `# ${title}\n\n`;
  markdown += `*Generated on: ${new Date().toISOString()}*\n\n`;
  markdown += "```\n";
  markdown += generateAsciiTableWrapped(data);
  markdown += "\n```\n";
  return markdown;
}

function generateAsciiTableWrapped(data) {
  if (!data || data.length === 0) return "No data to display";

  const columns = extractAllColumns(data);
  const tree = buildHeaderTree(columns);
  const headerRows = buildHeaderRows(tree);
  const leafColumns = columns;

  const wrapText = (text, maxWidth) => {
    const str = String(text || "");
    const words = str.split(" ");
    const lines = [];
    let currentLine = "";
    for (let word of words) {
      if (word.length > maxWidth) {
        if (currentLine) lines.push(currentLine), (currentLine = "");
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.slice(i, i + maxWidth));
        }
      } else if ((currentLine + " " + word).trim().length > maxWidth) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += " " + word;
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    return lines.length ? lines : [""];
  };

  const columnWidths = {};
  leafColumns.forEach((col) => {
    const allLines = data.flatMap((row) => {
      const keys = col.split(".");
      let val = row;
      for (const key of keys) val = val?.[key];
      if (Array.isArray(val)) {
        val = val
          .map((v) => (typeof v === "object" ? JSON.stringify(v) : v))
          .join(", ");
      } else if (typeof val === "object" && val !== null) {
        val = JSON.stringify(val);
      }
      return wrapText(val, 30);
    });
    const maxLen = Math.max(
      col.split(".").pop().length,
      ...allLines.map((l) => l.length)
    );
    columnWidths[col] = Math.min(Math.max(10, maxLen), 30);
  });

  const pad = (text, width, align = "left") => {
    const str = String(text || "");
    if (str.length >= width) return str;
    const space = " ".repeat(width - str.length);
    return align === "center"
      ? space.slice(0, space.length / 2) + str + space.slice(space.length / 2)
      : align === "right"
      ? space + str
      : str + space;
  };

  const drawLine = (left, middle, right) => {
    return (
      left +
      leafColumns.map((col) => "─".repeat(columnWidths[col] + 2)).join(middle) +
      right +
      "\n"
    );
  };

  let table = drawLine("┌", "┬", "┐");

  headerRows.forEach((row) => {
    let colIndex = 0;
    table +=
      "│" +
      row
        .map(({ label, span }) => {
          const width = leafColumns
            .slice(colIndex, colIndex + span)
            .reduce((sum, col) => sum + columnWidths[col] + 2, 0);
          const padded = pad(label, width, "center");
          colIndex += span;
          return padded;
        })
        .join("│") +
      "│\n";
  });

  table += drawLine("├", "┼", "┤");

  const expandDataRows = (row, columns) => {
    const resolved = columns.map((col) => {
      const keys = col.split(".");
      let val = row;
      for (let key of keys) {
        if (Array.isArray(val)) val = val.map((v) => v?.[key]);
        else val = val?.[key];
      }
      return Array.isArray(val) ? val : [val];
    });

    const maxRows = Math.max(...resolved.map((col) => col.length));
    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      const row = resolved.map((col) =>
        col[i] !== undefined ? col[i] : i === 0 ? col[0] : ""
      );
      rows.push(row);
    }
    return rows;
  };

  data.forEach((row, rowIndex) => {
    const expandedRows = expandDataRows(row, leafColumns);
    expandedRows.forEach((cells, rowIdx) => {
      const wrappedRow = cells.map((cell, idx) => {
        let val = Array.isArray(cell) ? cell.join(", ") : cell;
        if (typeof val === "object" && val !== null) val = JSON.stringify(val);
        return wrapText(val, columnWidths[leafColumns[idx]]);
      });

      const rowHeight = Math.max(...wrappedRow.map((lines) => lines.length));
      for (let lineIdx = 0; lineIdx < rowHeight; lineIdx++) {
        table +=
          "│" +
          wrappedRow
            .map((lines, idx) => {
              const colKey = leafColumns[idx];
              const isUserId = colKey === "user_id";
              const cellLine =
                isUserId && (rowIdx > 0 || lineIdx > 0)
                  ? ""
                  : lines[lineIdx] || "";
              return " " + pad(cellLine, columnWidths[colKey]) + " ";
            })
            .join("│") +
          "│\n";
      }
    });

    // Draw row separator only if it's not the last row
    if (rowIndex < data.length - 1) {
      table += drawLine("├", "┼", "┤");
    }
  });

  table += drawLine("└", "┴", "┘");
  return table;
}
/**
 * Generate and save markdown file from JSON data
 * POST /api/generate-file
 */
app.post("/api/generate-file", async (req, res) => {
  try {
    const { data, filename, options = {} } = req.body;

    if (!data) {
      return res.status(400).json({
        error: "Missing required field: data",
        message: "Please provide JSON data in the request body",
      });
    }

    // Set default filename if not provided
    const outputFilename = filename || `dynamic-table-${Date.now()}.md`;

    // Generate complete markdown document with dynamic structure
    const markdownDocument = generateMarkdownDocument(data, options);

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "output");
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Write file
    const filePath = path.join(outputDir, outputFilename);
    await fs.writeFile(filePath, markdownDocument, "utf8");

    res.json({
      success: true,
      message: "Dynamic markdown file generated successfully",
      filename: outputFilename,
      filePath: filePath,
      options: {
        format: options.format || "ascii",
        title: options.title || "Dynamic Data Table",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating file:", error);
    res.status(500).json({
      error: "Failed to generate file",
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 JSON to Markdown API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(
    `📝 Generate table: POST http://localhost:${PORT}/api/generate-table`
  );
  console.log(
    `💾 Generate file: POST http://localhost:${PORT}/api/generate-file`
  );
});

module.exports = app;
