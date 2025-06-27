# 📝 JSON to Markdown Table Generator (ASCII Format)

This Node.js application exposes an API to dynamically generate structured Markdown tables (in ASCII format) from complex and nested JSON input. It intelligently builds multi-level headers and supports **row-spanning**, **column wrapping**, and **deeply nested structures** to deliver professional, readable markdown tables.

---

## 🚀 Features

- 📊 Supports deeply nested JSON data with multi-level header rendering.
- 🧠 Automatic row spanning for repeating values (e.g., `user_id`).
- 📦 Wraps long strings gracefully within cells.
- 📁 Generates `.md` files with properly formatted ASCII tables.
- 📐 Calculates column widths and padding dynamically.
- 🔄 Handles arrays of primitive values and nested objects.
- 🧾 Supports custom titles and filenames.

---

## 📦 Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/json-to-markdown-table.git
   cd json-to-markdown-table
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the server:**

   ```bash
   node index.js
   ```

   The server will start on [http://localhost:5001](http://localhost:5001)

---

## 📡 API Usage

### Endpoint

```
POST /api/generate-file
```

### Request Body

```json
{
  "data": [
    /* your JSON array */
  ],
  "filename": "optional-filename.md",
  "options": {
    "title": "Optional Table Title"
  }
}
```

- `data`: Array of JSON objects to convert to a markdown table.
- `filename`: Optional name of the `.md` file.
- `options.title`: Optional custom title for the Markdown file.

### Example

```json
{
  "data": [
    {
      "user_id": "abc123",
      "events": [
        {
          "type": "click",
          "timestamp": "2024-06-01T12:00:00Z",
          "metadata": { "button": "submit", "page": "home" }
        },
        {
          "type": "scroll",
          "timestamp": "2024-06-01T12:01:00Z"
        }
      ]
    },
    {
      "user_id": "def123",
      "events": [
        {
          "type": "hover",
          "timestamp": "2024-06-01T12:00:00Z",
          "metadata": { "button": "checked", "page": "contact" }
        }
      ]
    }
  ],
  "filename": "user-events.md",
  "options": {
    "title": "User Activity Table"
  }
}
```

---

## 📂 Output

The generated Markdown file will be saved inside the `output/` directory of the project root:

```bash
output/user-events.md
```

You can open it in any Markdown viewer or plain text editor.

---

## 📬 API Testing (with `curl`)

```bash
curl -X POST http://localhost:5001/api/generate-file \
  -H "Content-Type: application/json" \
  -d @payload.json
```

Where `payload.json` contains your request body.

---

## 🧪 Health Check

You can verify if the server is running by visiting:

```
http://localhost:5001/health
```

(Implement if needed)

---

## 🔧 Customization

You can modify:

- Maximum column width
- Row/column wrapping behavior
- Row spanning logic
- File naming logic

---

## 📜 License

MIT License

---

> Developed with ❤️ to transform your nested JSON into beautiful, readable tables.
