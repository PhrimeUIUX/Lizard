import { useState } from 'react';

interface CoffeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COFFEE_QR_SRC = '/images/coffee-qr.png';

export function CoffeeModal({ isOpen, onClose }: CoffeeModalProps) {
  const [imageMissing, setImageMissing] = useState(false);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation">
      <section
        className="modal-card coffee-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Buy me a coffee"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head coffee-head">
          <h2 className="coffee-title">Buy me a coffee?</h2>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>

        <p className="coffee-text">If you enjoy this lizard chaos, your support keeps this project alive.</p>

        <div className="qr-wrap">
          {imageMissing ? (
            <p className="muted">Add your QR image at `/public/images/coffee-qr.png`.</p>
          ) : (
            <img
              className="qr-image"
              src={COFFEE_QR_SRC}
              alt="Buy me a coffee QR code"
              onError={() => setImageMissing(true)}
            />
          )}
        </div>
      </section>
    </div>
  );
}
