// @ts-check
"use strict";

const vscode = require("vscode");

const JSX_LANGUAGES = [
  "javascriptreact",
  "typescriptreact",
  "javascript",
  "typescript",
];

const CFG_SECTION = "classNameTemplateLiteral";

function getConfig() {
  const c = vscode.workspace.getConfiguration(CFG_SECTION);
  return {
    wrapWidth: Math.max(30, c.get("wrapWidth", 80)),
    alwaysMultiline: c.get("alwaysMultiline", false),
    convertOnType: c.get("convertOnType", true),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS (no vscode API → easy to test)
// ════════════════════════════════════════════════════════════════════════════

/** Index after the closing quote of a JS string starting at `i`, or -1. */
function skipQuoted(text, i) {
  const q = text[i];
  i++;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === q) return i + 1;
    if (ch === "\n") return -1;
    i++;
  }
  return -1;
}

/** Index after the closing backtick of a template literal starting at `i`, or -1. */
function skipTemplate(text, i) {
  i++;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "`") return i + 1;
    if (ch === "$" && text[i + 1] === "{") {
      i = skipExpr(text, i + 2);
      if (i < 0) return -1;
      continue;
    }
    i++;
  }
  return -1;
}

/** `i` points just after `${`. Returns index after the matching `}`, or -1. */
function skipExpr(text, i) {
  let depth = 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      i = skipQuoted(text, i);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "`") {
      i = skipTemplate(text, i);
      if (i < 0) return -1;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i + 1;
    i++;
  }
  return -1;
}

const skipWs = (text, i) => {
  while (i < text.length && /\s/.test(text[i])) i++;
  return i;
};

/**
 * Finds every className attribute whose value is a plain string or a template
 * literal, in any of these shapes:
 *   className="a b"      className='a b'
 *   className={"a b"}    className={'a b'}
 *   className={`a b ${x}`}
 * Anything more complex (cn(...), a + b, styles.x) is left alone.
 *
 * @returns {{start:number,end:number,kind:'jsx'|'js'|'tpl',body:string}[]}
 */
function findClassNames(text) {
  const out = [];
  const ATTR = /\bclassName\s*=\s*/g;
  let m;
  while ((m = ATTR.exec(text)) !== null) {
    const start = m.index;
    let i = start + m[0].length;
    const ch = text[i];

    if (ch === '"' || ch === "'") {
      // JSX attribute string: no escapes, may span lines.
      const e = text.indexOf(ch, i + 1);
      if (e < 0) continue;
      out.push({ start, end: e + 1, kind: "jsx", body: text.slice(i + 1, e) });
      ATTR.lastIndex = e + 1;
    } else if (ch === "{") {
      const j = skipWs(text, i + 1);
      const c = text[j];
      let valueEnd = -1;
      let kind = "js";
      let bodyStart = j + 1;
      if (c === '"' || c === "'") valueEnd = skipQuoted(text, j);
      else if (c === "`") {
        valueEnd = skipTemplate(text, j);
        kind = "tpl";
      }
      if (valueEnd < 0) continue;
      const k = skipWs(text, valueEnd);
      if (text[k] !== "}") continue; // e.g. {"a" + b}
      out.push({
        start,
        end: k + 1,
        kind: /** @type {any} */ (kind),
        body: text.slice(bodyStart, valueEnd - 1),
      });
      ATTR.lastIndex = k + 1;
    }
  }
  return out;
}

/** Split template body into class "words"; `${...}` stays glued to its word. */
function tokenizeTemplate(body) {
  const words = [];
  let cur = "";
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === "$" && body[i + 1] === "{") {
      const e = skipExpr(body, i + 2);
      if (e < 0) return null;
      cur += body.slice(i, e);
      i = e;
    } else if (ch === "\\") {
      cur += body.slice(i, i + 2);
      i += 2;
    } else if (/\s/.test(ch)) {
      if (cur) {
        words.push(cur);
        cur = "";
      }
      i++;
    } else {
      cur += ch;
      i++;
    }
  }
  if (cur) words.push(cur);
  return words;
}

/** Make text that came from a plain string safe inside a template literal. */
function toTemplateSafe(word, kind) {
  let w = word;
  if (kind === "jsx") w = w.replace(/\\/g, "\\\\"); // JSX strings treat \ literally
  return w.replace(/(?<!\\)`/g, "\\`").replace(/(?<!\\)\$\{/g, "\\${");
}

function visualWidth(str, tabSize) {
  let w = 0;
  for (const ch of str) w += ch === "\t" ? tabSize - (w % tabSize) : 1;
  return w;
}

function wrapWords(words, max) {
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length > max) {
      lines.push(cur);
      cur = w;
    } else cur += " " + w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * @param {string} text
 * @param {{tabSize:number, insertSpaces:boolean, wrapWidth:number, alwaysMultiline:boolean}} o
 * @returns {{start:number,end:number,replacement:string}[]}
 */
function collectEdits(text, o) {
  const edits = [];
  const tabStr = o.insertSpaces ? " ".repeat(o.tabSize) : "\t";

  for (const hit of findClassNames(text)) {
    const lineStart = text.lastIndexOf("\n", hit.start - 1) + 1;
    const before = text.slice(lineStart, hit.start).replace(/\r$/, "");
    const trimmed = before.trimStart();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    )
      continue;

    let words;
    if (hit.kind === "tpl") {
      words = tokenizeTemplate(hit.body);
      if (!words || words.some((w) => /[\r\n]/.test(w))) continue; // multi-line expr: don't touch
    } else {
      words = hit.body
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => toTemplateSafe(w, hit.kind));
    }

    const baseIndent = /^[ \t]*/.exec(before)[0];
    const backtickIndent = baseIndent + tabStr;
    const wrapIndent = backtickIndent + " "; // lines up under the first char after the backtick

    let replacement;
    if (words.length === 0) {
      replacement = "className={``}";
    } else {
      const single = "className={`" + words.join(" ") + "`}";
      const startCol = visualWidth(before, o.tabSize);
      if (!o.alwaysMultiline && startCol + single.length <= o.wrapWidth) {
        replacement = single;
      } else {
        const max = Math.max(
          20,
          o.wrapWidth - visualWidth(wrapIndent, o.tabSize) - 1,
        );
        const lines = wrapWords(words, max);
        replacement =
          "className={\n" +
          backtickIndent +
          "`" +
          lines.join("\n" + wrapIndent) +
          "`\n" +
          baseIndent +
          "}";
      }
    }

    const original = text.slice(hit.start, hit.end).replace(/\r\n/g, "\n");
    if (original !== replacement) {
      edits.push({ start: hit.start, end: hit.end, replacement });
    }
  }
  return edits;
}

const snippetEscape = (s) => s.replace(/[\\$}]/g, "\\$&");

// ════════════════════════════════════════════════════════════════════════════
// EXTENSION
// ════════════════════════════════════════════════════════════════════════════

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  let busy = false; // guards against our own edits re-triggering the listener

  // ── 1. Completion: type "cl…" → className={`|`} ───────────────────────────
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    JSX_LANGUAGES,
    {
      provideCompletionItems(document, position) {
        const prefix = document
          .lineAt(position.line)
          .text.slice(0, position.character);
        const wordMatch = /([A-Za-z]+)$/.exec(prefix);
        if (!wordMatch) return undefined;

        const typed = wordMatch[1];
        if (typed.length < 2 || !"className".startsWith(typed))
          return undefined;

        const before = prefix.slice(0, -typed.length);
        if (/[\w$.'"`]$/.test(before)) return undefined; // member access / mid-identifier

        const inTag = /<[A-Za-z][^<>]*\s$/.test(before);
        if (!inTag && !/^\s*$/.test(before)) return undefined;

        const item = new vscode.CompletionItem(
          "className",
          vscode.CompletionItemKind.Snippet,
        );
        item.range = new vscode.Range(
          position.translate(0, -typed.length),
          position,
        );
        item.insertText = new vscode.SnippetString("className={`$1`}");
        item.detail = "className={``} (Template Literal)";
        item.documentation = new vscode.MarkdownString(
          "Inserts a template-literal className.",
        );
        if (inTag) {
          item.sortText = "\0";
          item.preselect = true;
        }
        return [item];
      },
    },
  );

  // ── 2. On-type: className="x" → className={`x`} ───────────────────────────
  const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (busy || event.reason !== undefined) return; // ignore undo/redo & own edits
    if (!getConfig().convertOnType) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) return;
    if (!JSX_LANGUAGES.includes(event.document.languageId)) return;
    if (event.contentChanges.length !== 1) return;

    const change = event.contentChanges[0];
    if (change.text.includes("\n") || !/["']|className=/.test(change.text))
      return;

    const lineNo = change.range.start.line;

    setTimeout(() => {
      const ed = vscode.window.activeTextEditor;
      if (busy || !ed || ed.document !== event.document) return;
      const cursor = ed.selection.active;
      if (cursor.line !== lineNo || lineNo >= ed.document.lineCount) return;

      const line = ed.document.lineAt(lineNo).text;
      const RE = /className=(["'])([^"'\n]*)\1/g;
      let m;
      while ((m = RE.exec(line)) !== null) {
        const s = m.index;
        const e = s + m[0].length;
        if (cursor.character < s || cursor.character > e) continue; // not the one being typed

        const inner = m[2]
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => toTemplateSafe(w, "jsx"))
          .join(" ");
        const trailingSpace = /\s$/.test(m[2]) ? " " : "";
        const snippet = new vscode.SnippetString(
          "className={`" + snippetEscape(inner + trailingSpace) + "$0`}",
        );
        const range = new vscode.Range(lineNo, s, lineNo, e);

        busy = true;
        Promise.resolve(ed.insertSnippet(snippet, range)).then(
          () => {
            busy = false;
          },
          () => {
            busy = false;
          },
        );
        return;
      }
    }, 10);
  });

  // ── 3. Format command (whole file, or selection if any) ───────────────────
  const formatCommand = vscode.commands.registerCommand(
    `${CFG_SECTION}.formatFile`,
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const doc = editor.document;
      if (!JSX_LANGUAGES.includes(doc.languageId)) return;

      const cfg = getConfig();
      let edits = collectEdits(doc.getText(), {
        tabSize:
          typeof editor.options.tabSize === "number"
            ? editor.options.tabSize
            : 2,
        insertSpaces: editor.options.insertSpaces !== false,
        wrapWidth: cfg.wrapWidth,
        alwaysMultiline: cfg.alwaysMultiline,
      });

      if (!editor.selection.isEmpty) {
        const s = doc.offsetAt(editor.selection.start);
        const e = doc.offsetAt(editor.selection.end);
        edits = edits.filter((x) => x.start >= s && x.end <= e);
      }

      if (edits.length === 0) {
        vscode.window.showInformationMessage(
          "All classNames are already formatted.",
        );
        return;
      }

      busy = true;
      try {
        await editor.edit(
          (b) => {
            for (const x of edits) {
              b.replace(
                new vscode.Range(
                  doc.positionAt(x.start),
                  doc.positionAt(x.end),
                ),
                x.replacement,
              );
            }
          },
          { undoStopBefore: true, undoStopAfter: true },
        );
      } finally {
        busy = false;
      }
      vscode.window.showInformationMessage(
        `Formatted ${edits.length} className(s).`,
      );
    },
  );

  // ── 4. Status bar button ──────────────────────────────────────────────────
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = "$(symbol-string) Format classNames";
  statusBarItem.tooltip = "Convert & format classNames as template literals";
  statusBarItem.command = `${CFG_SECTION}.formatFile`;

  const updateStatusBar = () => {
    const ed = vscode.window.activeTextEditor;
    if (ed && JSX_LANGUAGES.includes(ed.document.languageId))
      statusBarItem.show();
    else statusBarItem.hide();
  };
  updateStatusBar();

  context.subscriptions.push(
    completionProvider,
    changeListener,
    formatCommand,
    statusBarItem,
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  _test: { collectEdits, findClassNames },
};
