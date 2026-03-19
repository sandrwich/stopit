import { useRef, useCallback, useEffect } from 'react';
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  diffSourcePlugin,
  codeBlockPlugin,
  imagePlugin,
  linkPlugin,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  ListsToggle,
  BlockTypeSelect,
  CodeToggle,
  InsertThematicBreak,
  UndoRedo,
  Separator,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import InsertImageRef from './InsertImageRef.tsx';

interface ContentEditorProps {
  markdown: string;
  onChange: (markdown: string) => void;
  imageCount: number;
}

export default function ContentEditor({ markdown, onChange, imageCount }: ContentEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastSetRef = useRef(markdown);

  const handleChange = useCallback((md: string) => {
    lastSetRef.current = md;
    onChange(md);
  }, [onChange]);

  // Sync editor when markdown changes externally (e.g. AI generate)
  useEffect(() => {
    if (markdown !== lastSetRef.current) {
      lastSetRef.current = markdown;
      editorRef.current?.setMarkdown(markdown);
    }
  }, [markdown]);

  // Patch image:N wrappers to show alt text as a visible label
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.querySelectorAll<HTMLElement>('[data-editor-block-type="image"]').forEach(wrapper => {
        if (wrapper.querySelector('.img-ref-label')) return;
        const img = wrapper.querySelector('img');
        const alt = img?.alt || 'image';
        const label = document.createElement('span');
        label.className = 'img-ref-label';
        label.textContent = `🖼 ${alt}`;
        label.style.cssText = 'font-size:11px;font-weight:600;pointer-events:none;white-space:nowrap;';
        wrapper.appendChild(label);
      });
    });
    observer.observe(el, { childList: true, subtree: true });
    // Run once immediately
    observer.takeRecords();
    el.querySelectorAll<HTMLElement>('[data-editor-block-type="image"]').forEach(wrapper => {
      if (wrapper.querySelector('.img-ref-label')) return;
      const img = wrapper.querySelector('img');
      const alt = img?.alt || 'image';
      const label = document.createElement('span');
      label.className = 'img-ref-label';
      label.textContent = `🖼 ${alt}`;
      label.style.cssText = 'font-size:11px;font-weight:600;pointer-events:none;white-space:nowrap;';
      wrapper.appendChild(label);
    });
    return () => observer.disconnect();
  }, [markdown]);

  return (
    <div ref={wrapperRef}>
    <MDXEditor
      ref={editorRef}
      markdown={markdown}
      onChange={handleChange}
      className="mdx-editor-meme"
      contentEditableClassName="mdxeditor-root-contenteditable"
      placeholder="# STOP DOING SOMETHING — start writing your meme..."
      plugins={[
        headingsPlugin({ allowedHeadingLevels: [1, 2, 3] }),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        imagePlugin({
          disableImageResize: true,
          disableImageSettingsButton: true,
        }),
        codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
        diffSourcePlugin({ viewMode: 'rich-text' }),
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={['rich-text', 'source']}>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
              <StrikeThroughSupSubToggles options={['Strikethrough']} />
              <CodeToggle />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle options={['bullet', 'number']} />
              <Separator />
              <InsertImageRef imageCount={imageCount} />
              <InsertCodeBlock />
              <InsertThematicBreak />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
    </div>
  );
}
