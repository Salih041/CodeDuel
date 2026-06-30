'use client';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'var(--text-secondary)'}}>Loading Editor...</div>
});

export default function CodeEditor({ 
    language, 
    value, 
    onChange, 
    readOnly = false,
    onSubmit
}) {
    return (
        <MonacoEditor
            height="100%"
            language={language}
            theme="vs-dark"
            value={value}
            onChange={onChange}
            options={{
                readOnly: readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                domReadOnly: readOnly,
            }}
            onMount={(editor, monaco) => {
                if (!readOnly && onSubmit) {
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                        onSubmit();
                    });
                }
            }}
        />
    );
}

