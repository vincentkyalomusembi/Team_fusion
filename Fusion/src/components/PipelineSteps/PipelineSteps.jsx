import './PipelineSteps.css';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const DEFAULT_STEPS = [
    { step: 'Data ingestion',       detail: 'Content extracted from PDF, Word, or CSV upload.' },
    { step: 'Exposure from LLM',    detail: 'Chunked text is sent to the LLM to generate structured exposure rows.' },
    { step: 'ML exposure estimate', detail: 'Machine learning refines TIV and building attributes.' },
    { step: 'CAT model',            detail: 'Vulnerability function per building class produces a damage ratio.' },
    { step: 'Loss metrics',         detail: 'Damage ratio × TIV → building loss, portfolio loss, EP curve, AEP.' },
    { step: 'LLM explanation',      detail: 'Metrics are sent to the LLM, which writes a reinsurer-ready summary.' },
];

export default function PipelineSteps({ steps }) {
    const [open, setOpen] = useState(false);
    const list = steps?.length ? steps : DEFAULT_STEPS;

    return (
        <section className="panel pipeline">
            <button className="method" onClick={() => setOpen((o) => !o)} type="button">
                <h3>How we got these numbers</h3>
                <ChevronDown
                    size={18}
                    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                />
            </button>

            {open && (
                <ol className="pipeline-list">
                    {list.map((s, i) => (
                        <li key={i}>
                            <span className="pipeline-num">{i + 1}</span>
                            <div>
                                <b>{s.step}</b>
                                <p>{s.detail}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}