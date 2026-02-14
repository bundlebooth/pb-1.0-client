/**
 * Rich Text Editor Component
 * WYSIWYG editor using React Quill for blog posts, FAQs, and other content
 */

import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Write your content here...', 
  height = 300,
  readOnly = false 
}) => {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
    clipboard: {
      matchVisual: false
    }
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'link', 'image',
    'blockquote', 'code-block',
    'color', 'background'
  ];

  return (
    <div className="rich-text-editor" style={{ marginBottom: '1rem' }}>
      <style>{`
        .rich-text-editor .ql-container {
          min-height: ${height}px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        .rich-text-editor .ql-editor {
          min-height: ${height - 42}px;
          padding: 1.25rem 1rem;
          line-height: 1.8;
          font-size: 1rem;
        }
        .rich-text-editor .ql-editor p {
          margin-bottom: 1rem;
        }
        .rich-text-editor .ql-editor h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 1rem;
          margin-top: 0.5rem;
          line-height: 1.3;
        }
        .rich-text-editor .ql-editor h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.875rem;
          margin-top: 0.5rem;
          line-height: 1.3;
        }
        .rich-text-editor .ql-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          margin-top: 0.5rem;
          line-height: 1.4;
        }
        .rich-text-editor .ql-editor ul,
        .rich-text-editor .ql-editor ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .rich-text-editor .ql-editor li {
          margin-bottom: 0.5rem;
        }
        .rich-text-editor .ql-editor blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #6b7280;
          font-style: italic;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f9fafb;
          border-color: #e5e7eb;
          padding: 0.75rem;
        }
        .rich-text-editor .ql-toolbar .ql-formats {
          margin-right: 12px;
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          border-color: #e5e7eb;
          background: white;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
          padding-left: 0;
        }
      `}</style>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
};

export default RichTextEditor;
