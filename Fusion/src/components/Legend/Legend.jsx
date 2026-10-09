import './Legend.css';
import { SEVERITY } from '../../utils';

export default function Legend({ showSize }) {
  return (
      <div className="legend">
      <span>
        <i style={{ background: SEVERITY.red }} />
        Flood hotspot
      </span>
        {showSize && (
            <>
              <span><i className="dot sm" />TIV ≤ 2M</span>
              <span><i className="dot lg" />TIV ≥ 50M</span>
            </>
        )}
      </div>
  );
}