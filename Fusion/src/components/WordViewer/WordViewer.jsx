import './WordViewer.css';
import { X } from 'lucide-react';

export default function WordViewer({ url, onClose }) {
    const embed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
        <div className="modal-bg" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <header>
                    <h3>Word document preview</h3>
                    <button className="icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
                </header>
                <iframe src={embed} title="Word document preview" />
                <footer>
                    <a className="btn red" href={url} download>Download .docx</a>
                </footer>
            </div>
        </div>
    );
}