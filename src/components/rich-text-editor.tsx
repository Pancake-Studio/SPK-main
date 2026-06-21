"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Type,
  List,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RichTextEditorProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "พิมพ์ข้อความประกาศ…",
  className,
  minHeight = "12rem",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [empty, setEmpty] = useState(!defaultValue || defaultValue === "<br>");

  const updateActiveStates = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
    });
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveStates();
  };

  const handleInput = () => {
    const value = editorRef.current?.innerHTML ?? "";
    setHtml(value);
    setEmpty(editorRef.current?.innerText.trim().length === 0);
    updateActiveStates();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultValue;
      setEmpty(editorRef.current.innerText.trim().length === 0);
    }
  }, [defaultValue]);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    const onSelectionChange = () => updateActiveStates();
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const ToolbarButton = ({
    onClick,
    activeKey,
    title,
    children,
  }: {
    onClick: () => void;
    activeKey?: string;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={activeKey ? active[activeKey] : undefined}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring",
        activeKey && active[activeKey]
          ? "bg-accent text-accent-foreground border-border"
          : "bg-transparent text-muted-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 px-2 py-1.5">
        <ToolbarButton onClick={() => exec("bold")} activeKey="bold" title="ตัวหนา">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} activeKey="italic" title="ตัวเอียง">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} activeKey="underline" title="ขีดเส้นใต้">
          <Underline className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={() => exec("formatBlock", "H1")} title="หัวข้อใหญ่">
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "H2")} title="หัวข้อย่อย">
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "P")} title="ย่อหน้า">
          <Type className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={() => exec("insertUnorderedList")} activeKey="unorderedList" title="รายการจุด">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} activeKey="orderedList" title="รายการลำดับเลข">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <select
          title="ขนาดตัวอักษร"
          onChange={(e) => {
            exec("fontSize", e.target.value);
            e.target.value = "";
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            ขนาดตัวอักษร
          </option>
          <option value="2">เล็ก</option>
          <option value="3">ปกติ</option>
          <option value="5">ใหญ่</option>
          <option value="7">ใหญ่มาก</option>
        </select>
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline
          aria-label="เนื้อหาประกาศ"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          style={{ minHeight }}
          className="prose prose-sm dark:prose-invert max-w-none px-3 py-2.5 outline-none"
          data-placeholder={placeholder}
        />
        {empty && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
            {placeholder}
          </span>
        )}
      </div>

      <input type="hidden" name={name} value={html} />
    </div>
  );
}
