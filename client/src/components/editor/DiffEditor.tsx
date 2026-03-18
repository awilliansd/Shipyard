import { useMemo, useRef, useEffect } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { MergeView } from '@codemirror/merge'
import { oneDark } from '@codemirror/theme-one-dark'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import type { Extension } from '@codemirror/state'

function getLanguageExtension(ext: string): Extension[] {
  const map: Record<string, () => Extension> = {
    '.ts': () => javascript({ typescript: true }),
    '.tsx': () => javascript({ typescript: true, jsx: true }),
    '.js': () => javascript(),
    '.jsx': () => javascript({ jsx: true }),
    '.mjs': () => javascript(),
    '.cjs': () => javascript(),
    '.json': () => json(),
    '.jsonc': () => json(),
    '.css': () => css(),
    '.scss': () => css(),
    '.sass': () => css(),
    '.less': () => css(),
    '.html': () => html(),
    '.htm': () => html(),
    '.md': () => markdown(),
    '.mdx': () => markdown(),
    '.py': () => python(),
    '.rs': () => rust(),
    '.sql': () => sql(),
    '.yaml': () => yaml(),
    '.yml': () => yaml(),
    '.xml': () => xml(),
    '.svg': () => xml(),
  }
  const factory = map[ext]
  return factory ? [factory()] : []
}

interface DiffEditorProps {
  original: string
  modified: string
  extension: string
}

export function DiffEditor({ original, modified, extension }: DiffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<MergeView | null>(null)

  const langExtensions = useMemo(() => getLanguageExtension(extension), [extension])

  useEffect(() => {
    if (!containerRef.current) return

    const sharedExtensions: Extension[] = [
      basicSetup,
      oneDark,
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      ...langExtensions,
    ]

    const view = new MergeView({
      a: {
        doc: original,
        extensions: sharedExtensions,
      },
      b: {
        doc: modified,
        extensions: sharedExtensions,
      },
      parent: containerRef.current,
      collapseUnchanged: { margin: 3, minSize: 4 },
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [original, modified, langExtensions])

  return (
    <div
      ref={containerRef}
      className="h-full [&_.cm-mergeView]:h-full [&_.cm-mergeViewEditors]:h-full [&_.cm-mergeViewEditor]:overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:!font-mono"
      style={{ height: '100%' }}
    />
  )
}
