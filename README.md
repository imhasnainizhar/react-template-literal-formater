<div align="center">

<br />

<img alt="ChatGPT Image Sep 30, 2026, 02_31_01 PM" src="https://github.com/user-attachments/assets/a0ec8a43-7d13-4e5c-a2ba-37e4f2ac6f75" width="96" height="96" alt="React Template Literal Formater" />

# React Template Literal Formatter

**A VS Code extension for keeping React `className` attributes clean, readable, and React-friendly.**

<br />

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-007ACC?style=for-the-badge\&logo=visualstudiocode\&logoColor=white)](https://marketplace.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-Ready-06B6D4?style=for-the-badge\&logo=tailwindcss\&logoColor=white)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-JSX%2FTSX-61DAFB?style=for-the-badge\&logo=react\&logoColor=black)](https://react.dev/)

<br />

</div>

---

## What is React Template Literal Formatter?

**React Template Literal Formatter** is a lightweight VS Code extension designed for React and Tailwind CSS workflows.

It makes `className` easier to write and maintain by:

* Quickly inserting template-literal `className` attributes
* Automatically correcting common `className=""` patterns
* Formatting long Tailwind utility lists into readable multi-line blocks
* Preserving JavaScript expressions and dynamic class logic
* Supporting JavaScript, TypeScript, JSX, and TSX

The goal is simple: **less formatting work, cleaner JSX.**

---

## ✨ Features

### ⚡ Instant `className` Autocomplete

Type `cl` or `className` and the extension places the preferred completion at the top of IntelliSense.

```jsx
<div cl
```

Press **Enter**:

```jsx
<div className={`|`}
```

The cursor is placed directly inside the template literal, ready for your classes.

---

### 🛡️ Smart Auto-Correction

Common static `className` patterns are automatically converted into template literals.

```jsx
<div className="">
```

becomes:

```jsx
<div className={``}>
```

The same applies to single quotes:

```jsx
<div className=''>
```

becomes:

```jsx
<div className={``}>
```

This is particularly useful when Emmet or VS Code inserts the default HTML-style attribute.

---

### 📐 Tailwind Class Formatter

Long Tailwind class lists can quickly become difficult to read.

**Before:**

```jsx
<div className="p-4 m-4 bg-black text-text-secondary text-shadow-text-primary text-[clamp(30px,2vw,16px)] flex flex-col justify-center items-center">
```

Run the formatter and get:

```jsx
<div className={`
    p-4 m-4 bg-black text-text-secondary text-shadow-text-primary
    text-[clamp(30px,2vw,16px)] flex flex-col justify-center items-center
`}>
```

The formatter handles:

| Feature                 | Behavior                                          |
| ----------------------- | ------------------------------------------------- |
| **Long class lists**    | Wraps classes across multiple lines               |
| **Line length**         | Targets approximately 70 characters               |
| **Indentation**         | Keeps formatting relative to the JSX element      |
| **Closing syntax**      | Aligns the closing `` `}` `` with the opening tag |
| **Dynamic expressions** | Preserves JavaScript expressions                  |
| **Existing formatting** | Avoids unnecessarily changing your code           |

---

## 🧠 Dynamic Classes Stay Dynamic

The formatter is designed to work with real-world React code, not just static Tailwind strings.

For example:

```jsx
<div className={`
    flex items-center justify-center
    ${isActive ? 'opacity-100' : 'opacity-0'}
`}>
```

Expressions such as:

```jsx
${isActive ? 'opacity-100' : 'opacity-0'}
```

remain intact.

**Your JavaScript logic stays yours. The formatter only handles the presentation.**

---

## 🚀 Usage

### Format from the Context Menu

Right-click inside a JavaScript, JSX, TypeScript, or TSX file and select:

> **Format className to `{``}`**

### Format from the Status Bar

You can also use the:

> **`className → {``}`**

button in the VS Code status bar.

---

## 📁 Supported Languages

The extension activates automatically for React-compatible files:

| Language         | File Types |
| ---------------- | ---------- |
| JavaScript       | `.js`      |
| JavaScript React | `.jsx`     |
| TypeScript       | `.ts`      |
| TypeScript React | `.tsx`     |

---

## 📦 Installation

### VS Code

1. Open **VS Code**
2. Open Extensions with `Ctrl+Shift+X` / `Cmd+Shift+X`
3. Search for **React Classname Formatter**
4. Select **Install**

### Command Line

```bash
code --install-extension react-classname-formatter
```

---

## 🧩 Why Template Literals?

Template literals make it convenient to combine Tailwind classes with JavaScript expressions:

```jsx
<div className={`
    flex items-center
    ${isActive ? 'bg-blue-500' : 'bg-gray-500'}
`}>
```

React Classname Formatter takes that approach and makes the resulting JSX easier to scan and maintain.

It is intentionally focused on **formatting and developer experience**, rather than trying to replace larger Tailwind tooling or class-merging libraries.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome.

### Development

```bash
git clone https://github.com/your-username/react-classname-formatter.git
cd react-classname-formatter
npm install
```

Create a feature branch:

```bash
git checkout -b feat/your-feature
```

Commit your changes:

```bash
git commit -m "feat: add my feature"
```

Push your branch:

```bash
git push origin feat/your-feature
```

Then open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**.

See [`LICENSE`](LICENSE) for the full license text.

---

<div align="center">

**Made with ❤️ for developers who care about the little things.**

<br />

<img alt="ChatGPT Image Sep 30, 2026, 02_31_01 PM" src="https://github.com/user-attachments/assets/a0ec8a43-7d13-4e5c-a2ba-37e4f2ac6f75" width="96" height="96" alt="React Template Literal Formater" />

</div>