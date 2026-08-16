import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Type } from 'lucide-react';

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const Button = ({ onClick, isActive = false, children }: any) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors flex items-center justify-center
        ${isActive ? 'bg-indigo-500 text-white' : 'hover:bg-white/10 text-white/80'}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-10 w-full rounded-t-2xl">
      <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
        <Button onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
          <Bold className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
          <Italic className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
          <UnderlineIcon className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
          <Strikethrough className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
        <Button onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })}>
          <AlignJustify className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1 border-r border-white/20 pr-2 mr-1">
        <Button onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
          <List className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive('subscript')}>
          <SubscriptIcon className="w-4 h-4" />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')}>
          <SuperscriptIcon className="w-4 h-4" />
        </Button>
        
        {/* Simple color picker integration */}
        <div className="relative flex items-center ml-1">
          <Type className="w-4 h-4 text-white/80 absolute pointer-events-none ml-1.5" />
          <input
            type="color"
            onInput={(event: any) => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#000000'}
            className="w-7 h-7 opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default function DocumentEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: `
      <h1>WPS Writer Clone (React + TipTap)</h1>
      <p>This is a powerful rich text editor built entirely on the frontend!</p>
      <p>Try <strong>bolding</strong>, <em>italicizing</em>, or coloring text.</p>
      <ul>
        <li>Bullet list item 1</li>
        <li>Bullet list item 2</li>
      </ul>
      <p style="text-align: center">Centered Paragraph</p>
    `,
    editorProps: {
      attributes: {
        className: 'prose max-w-none focus:outline-none min-h-[800px] bg-white text-black p-12 shadow-2xl rounded-b-2xl font-sans leading-relaxed',
        style: 'width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; margin-top: 10px;',
      },
    },
  });

  return (
    <div className="w-full flex flex-col items-center bg-black/20 p-2 sm:p-6 rounded-3xl overflow-y-auto max-h-[80vh] border border-white/20 shadow-inner">
      <div className="w-full max-w-[210mm] relative">
         <MenuBar editor={editor} />
         <EditorContent editor={editor} className="w-full [&_.ProseMirror]:border-0 [&_.ProseMirror]:ring-0" />
      </div>
    </div>
  );
}
