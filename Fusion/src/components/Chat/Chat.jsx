import './Chat.css';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { api } from '../../api';

const IDEAS = ['Which buildings drive most of the loss?', 'What does the exceedance curve tell me?', 'Which assumptions matter most?'];

export default function Chat({ id }) {
    const [msgs, setMsgs] = useState([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const end = useRef();
    useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs, busy]);

    const send = async (text) => {
        if (!text.trim() || busy) return;
        const next = [...msgs, { role: 'user', content: text }];
        setMsgs(next); setInput(''); setErr(''); setBusy(true);
        try {
            const r = await api.chat(id, next);
            setMsgs([...next, { role: 'assistant', content: r.reply }]);
        } catch (e) { setErr(e.message); }
        setBusy(false);
    };

    return (
        <section className="panel chat">
            <h3>Ask about these results</h3>
            <div className="msgs">
                {msgs.length === 0 && (
                    <div className="ideas">{IDEAS.map((q) => <button key={q} className="btn ghost" onClick={() => send(q)}>{q}</button>)}</div>
                )}
                {msgs.map((m, i) => <p key={i} className={`msg ${m.role}`}>{m.content}</p>)}
                {busy && <p className="msg assistant"><Loader2 className="spin" size={14} /> Thinking…</p>}
                <div ref={end} />
            </div>
            {err && <p className="error">{err}</p>}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about losses, buildings or assumptions…" disabled={busy} aria-label="Question" />
                <button className="btn red" type="submit" disabled={busy || !input.trim()} aria-label="Send"><Send size={15} /></button>
            </form>
        </section>
    );
}