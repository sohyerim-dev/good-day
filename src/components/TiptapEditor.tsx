"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";

interface Props {
  content: string;
  onChange: (html: string) => void;
}

export default function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content === "") {
      editor.commands.clearContent();
    } else if (editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* 툴바 */}
      <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 rounded-xl text-[13px] font-bold cursor-pointer ${
            editor.isActive("bold")
              ? "bg-[#EE6300] text-white"
              : "bg-white text-gray-600 border border-gray-200"
          }`}
        >
          B
        </button>
        {(["left", "center", "right"] as const).map((align) => (
          <button
            key={align}
            type="button"
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
            className={`px-3 py-1.5 rounded-xl text-[13px] cursor-pointer ${
              editor.isActive({ textAlign: align })
                ? "bg-[#EE6300] text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {align === "left" ? "≡" : align === "center" ? "☰" : "≡"}
            {align === "left" ? "L" : align === "center" ? "C" : "R"}
          </button>
        ))}
      </div>
      {/* 에디터 영역 */}
      <EditorContent
        editor={editor}
        className="p-4 min-h-[160px] text-[14px] leading-relaxed focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[140px]"
      />
    </div>
  );
}
